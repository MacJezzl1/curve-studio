import BN from "bn.js";
import Decimal from "decimal.js";
import {
  DBCConfig,
  TradeInput,
  TradeStepResult,
  SimulationResult,
  SimulationMetrics,
} from "./types.js";
import {
  sqrtPriceToPrice,
  getNextSqrtPriceFromQuoteIn,
  getNextSqrtPriceFromBaseIn,
  getBaseAmountForLiquidity,
  getQuoteAmountForLiquidity,
  splitTradingFee,
  BPS_DENOMINATOR,
} from "./math.js";

/**
 * Pure Bonding Curve Simulator.
 * Simulates sequential trades against piecewise virtual constant-product curve segments.
 */
export function simulateTrades(
  config: DBCConfig,
  trades: TradeInput[]
): SimulationResult {
  const steps: TradeStepResult[] = [];
  const baseDecimals = config.token.baseDecimals;
  const quoteDecimals = config.token.quoteDecimals;

  let currentSegmentIdx = 0;
  let currentSqrtPrice = config.segments[0]!.lowerSqrtPrice;
  let quoteReserve = new BN(0);
  let baseReserve = config.segments.reduce(
    (acc, seg) => acc.add(seg.baseAmount),
    new BN(0)
  );

  let totalVolumeQuote = new BN(0);
  let totalFeesProtocol = new BN(0);
  let totalFeesCreator = new BN(0);
  let totalFeesPartner = new BN(0);
  let isGraduated = false;
  let graduationStep: number | null = null;

  const walletBalances: Record<string, { base: BN; quoteSpent: BN }> = {};

  const initialPrice = sqrtPriceToPrice(currentSqrtPrice, baseDecimals, quoteDecimals);
  let peakPrice = initialPrice;

  for (let i = 0; i < trades.length; i++) {
    const trade = trades[i]!;
    const walletId = trade.walletId || `wallet_${i % 10}`;
    if (!walletBalances[walletId]) {
      walletBalances[walletId] = { base: new BN(0), quoteSpent: new BN(0) };
    }

    const spotPriceBefore = sqrtPriceToPrice(currentSqrtPrice, baseDecimals, quoteDecimals);
    let amountInRemaining = trade.amount;
    let totalAmountOut = new BN(0);
    let stepFeeTotal = new BN(0);

    if (trade.direction === "buy") {
      // Fee on buy (quote token in):
      // Calculate effective fee bps from scheduler (starting fee for simplicity, or linear decay over steps)
      const feeBps = config.fee.feeSchedulerParam.startingFeeBps;
      const feeAmount = amountInRemaining.mul(new BN(feeBps)).div(BPS_DENOMINATOR);
      const netQuoteIn = amountInRemaining.sub(feeAmount);
      stepFeeTotal = feeAmount;

      let remainingNetQuote = netQuoteIn;

      while (!remainingNetQuote.isZero() && currentSegmentIdx < config.segments.length) {
        const seg = config.segments[currentSegmentIdx]!;
        const maxQuoteInSeg = getQuoteAmountForLiquidity(
          currentSqrtPrice,
          seg.upperSqrtPrice,
          seg.liquidity
        );

        if (remainingNetQuote.gte(maxQuoteInSeg)) {
          // Cross entire segment
          const baseOut = getBaseAmountForLiquidity(
            currentSqrtPrice,
            seg.upperSqrtPrice,
            seg.liquidity
          );
          totalAmountOut = totalAmountOut.add(baseOut);
          quoteReserve = quoteReserve.add(maxQuoteInSeg);
          baseReserve = baseReserve.sub(baseOut);
          remainingNetQuote = remainingNetQuote.sub(maxQuoteInSeg);

          currentSqrtPrice = seg.upperSqrtPrice;
          currentSegmentIdx++;
        } else {
          // Partially fill within segment
          const nextSqrtPrice = getNextSqrtPriceFromQuoteIn(
            currentSqrtPrice,
            seg.liquidity,
            remainingNetQuote
          );
          const baseOut = getBaseAmountForLiquidity(
            currentSqrtPrice,
            nextSqrtPrice,
            seg.liquidity
          );
          totalAmountOut = totalAmountOut.add(baseOut);
          quoteReserve = quoteReserve.add(remainingNetQuote);
          baseReserve = baseReserve.sub(baseOut);

          currentSqrtPrice = nextSqrtPrice;
          remainingNetQuote = new BN(0);
        }
      }

      totalVolumeQuote = totalVolumeQuote.add(amountInRemaining);
      walletBalances[walletId]!.base = walletBalances[walletId]!.base.add(totalAmountOut);
      walletBalances[walletId]!.quoteSpent = walletBalances[walletId]!.quoteSpent.add(amountInRemaining);
    } else {
      // Sell: base tokens in, quote tokens out
      let remainingBaseIn = amountInRemaining;
      let grossQuoteOut = new BN(0);

      while (!remainingBaseIn.isZero() && currentSegmentIdx >= 0) {
        if (currentSegmentIdx >= config.segments.length) {
          currentSegmentIdx = config.segments.length - 1;
        }
        const seg = config.segments[currentSegmentIdx]!;
        const maxBaseInSeg = getBaseAmountForLiquidity(
          seg.lowerSqrtPrice,
          currentSqrtPrice,
          seg.liquidity
        );

        if (remainingBaseIn.gte(maxBaseInSeg)) {
          // Cross downwards
          const quoteOut = getQuoteAmountForLiquidity(
            seg.lowerSqrtPrice,
            currentSqrtPrice,
            seg.liquidity
          );
          grossQuoteOut = grossQuoteOut.add(quoteOut);
          baseReserve = baseReserve.add(maxBaseInSeg);
          quoteReserve = quoteReserve.sub(quoteOut);
          remainingBaseIn = remainingBaseIn.sub(maxBaseInSeg);

          currentSqrtPrice = seg.lowerSqrtPrice;
          if (currentSegmentIdx > 0) currentSegmentIdx--;
        } else {
          // Partial sell within segment
          const nextSqrtPrice = getNextSqrtPriceFromBaseIn(
            currentSqrtPrice,
            seg.liquidity,
            remainingBaseIn
          );
          const quoteOut = getQuoteAmountForLiquidity(
            nextSqrtPrice,
            currentSqrtPrice,
            seg.liquidity
          );
          grossQuoteOut = grossQuoteOut.add(quoteOut);
          baseReserve = baseReserve.add(remainingBaseIn);
          quoteReserve = quoteReserve.sub(quoteOut);

          currentSqrtPrice = nextSqrtPrice;
          remainingBaseIn = new BN(0);
        }
      }

      // Fee on sell taken from quote out
      const feeBps = config.fee.feeSchedulerParam.startingFeeBps;
      stepFeeTotal = grossQuoteOut.mul(new BN(feeBps)).div(BPS_DENOMINATOR);
      totalAmountOut = grossQuoteOut.sub(stepFeeTotal);

      totalVolumeQuote = totalVolumeQuote.add(grossQuoteOut);
      walletBalances[walletId]!.base = walletBalances[walletId]!.base.sub(trade.amount);
      walletBalances[walletId]!.quoteSpent = walletBalances[walletId]!.quoteSpent.sub(totalAmountOut);
    }

    // Split fees
    const split = splitTradingFee(
      stepFeeTotal,
      config.fee.creatorTradingFeePercentage,
      false
    );
    totalFeesProtocol = totalFeesProtocol.add(split.protocolFee);
    totalFeesCreator = totalFeesCreator.add(split.creatorFee);
    totalFeesPartner = totalFeesPartner.add(split.partnerFee);

    const spotPriceAfter = sqrtPriceToPrice(currentSqrtPrice, baseDecimals, quoteDecimals);
    if (spotPriceAfter > peakPrice) peakPrice = spotPriceAfter;

    // Effective price
    let effectivePrice = spotPriceAfter;
    if (trade.direction === "buy" && !totalAmountOut.isZero()) {
      const qInDec = new Decimal(trade.amount.toString()).div(Math.pow(10, quoteDecimals));
      const bOutDec = new Decimal(totalAmountOut.toString()).div(Math.pow(10, baseDecimals));
      effectivePrice = qInDec.div(bOutDec).toNumber();
    } else if (trade.direction === "sell" && !trade.amount.isZero()) {
      const qOutDec = new Decimal(totalAmountOut.toString()).div(Math.pow(10, quoteDecimals));
      const bInDec = new Decimal(trade.amount.toString()).div(Math.pow(10, baseDecimals));
      effectivePrice = qOutDec.div(bInDec).toNumber();
    }

    const priceImpactBps = Math.round(
      Math.abs((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 10000
    );

    // Check graduation condition
    if (!isGraduated && quoteReserve.gte(config.migrationQuoteThreshold)) {
      isGraduated = true;
      graduationStep = i;
    }

    steps.push({
      step: i,
      direction: trade.direction,
      walletId,
      amountIn: trade.amount,
      amountOut: totalAmountOut,
      spotPriceBefore,
      spotPriceAfter,
      effectivePrice,
      priceImpactBps,
      feeTotal: stepFeeTotal,
      feeProtocol: split.protocolFee,
      feePartner: split.partnerFee,
      feeCreator: split.creatorFee,
      quoteReserve,
      baseReserve,
      graduated: isGraduated,
    });
  }

  const finalPrice = sqrtPriceToPrice(currentSqrtPrice, baseDecimals, quoteDecimals);

  // Calculate Metrics
  const metrics = calculateMetrics(
    steps,
    walletBalances,
    initialPrice,
    peakPrice,
    finalPrice,
    config,
    totalFeesCreator,
    totalFeesProtocol,
    totalFeesPartner
  );

  const quoteProgressPercent = Math.min(
    100,
    new Decimal(quoteReserve.toString())
      .div(new Decimal(config.migrationQuoteThreshold.toString()))
      .mul(100)
      .toNumber()
  );

  const totalBaseAllocated = config.segments.reduce((acc, s) => acc.add(s.baseAmount), new BN(0));
  const baseSold = totalBaseAllocated.sub(baseReserve);
  const baseProgressPercent = Math.min(
    100,
    new Decimal(baseSold.toString())
      .div(new Decimal(totalBaseAllocated.toString()))
      .mul(100)
      .toNumber()
  );

  return {
    steps,
    initialPrice,
    finalPrice,
    peakPrice,
    totalVolumeQuote,
    totalFeesProtocol,
    totalFeesCreator,
    totalFeesPartner,
    isGraduated,
    graduationStep,
    quoteProgressPercent,
    baseProgressPercent,
    walletBalances,
    metrics,
  };
}

function calculateMetrics(
  steps: TradeStepResult[],
  walletBalances: Record<string, { base: BN; quoteSpent: BN }>,
  initialPrice: number,
  _peakPrice: number,
  _finalPrice: number,
  config: DBCConfig,
  totalCreatorFee: BN,
  totalProtocolFee: BN,
  totalPartnerFee: BN
): SimulationMetrics {
  // 1. Max Drawdown
  let maxDrawdown = 0;
  let runningPeak = initialPrice;
  for (const step of steps) {
    if (step.spotPriceAfter > runningPeak) {
      runningPeak = step.spotPriceAfter;
    }
    const dd = (runningPeak - step.spotPriceAfter) / runningPeak;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // 2. Effective Average Entry Price across all buyers
  let totalQuoteSpent = new Decimal(0);
  let totalBaseBought = new Decimal(0);
  for (const w of Object.values(walletBalances)) {
    if (w.base.gt(new BN(0))) {
      totalBaseBought = totalBaseBought.add(new Decimal(w.base.toString()));
      totalQuoteSpent = totalQuoteSpent.add(new Decimal(w.quoteSpent.toString()));
    }
  }

  const baseDecFactor = new Decimal(10).pow(config.token.baseDecimals);
  const quoteDecFactor = new Decimal(10).pow(config.token.quoteDecimals);

  const avgEntryPrice = totalBaseBought.isZero()
    ? initialPrice
    : totalQuoteSpent.div(quoteDecFactor).div(totalBaseBought.div(baseDecFactor)).toNumber();

  // 3. Fairness Score (Gini Coefficient over held token balances)
  const balances = Object.values(walletBalances)
    .map((w) => new Decimal(w.base.toString()).toNumber())
    .filter((b) => b > 0)
    .sort((a, b) => a - b);

  let fairnessScore = 1.0;
  if (balances.length > 1) {
    const n = balances.length;
    let sumDiff = 0;
    let sumTotal = 0;
    for (let i = 0; i < n; i++) {
      sumTotal += balances[i]!;
      for (let j = 0; j < n; j++) {
        sumDiff += Math.abs(balances[i]! - balances[j]!);
      }
    }
    const gini = sumTotal === 0 ? 0 : sumDiff / (2 * n * sumTotal);
    fairnessScore = Math.max(0, Math.min(1, 1 - gini));
  }

  // 4. Sniper Resistance Score (0 to 100)
  // Higher fee scheduler penalty, lower first-buy price impact -> higher resistance
  const startFeeBps = config.fee.feeSchedulerParam.startingFeeBps;
  const antiSnipeFeeScore = Math.min(40, (startFeeBps / 2500) * 40); // up to 40 pts for starting fee >= 25%
  const distributionScore = fairnessScore * 40; // up to 40 pts
  const drawdownResilience = Math.max(0, (1 - maxDrawdown) * 20); // up to 20 pts
  const sniperResistanceScore = Math.round(antiSnipeFeeScore + distributionScore + drawdownResilience);

  return {
    effectiveAverageEntryPrice: avgEntryPrice,
    maxDrawdownPercent: Math.round(maxDrawdown * 10000) / 100,
    fairnessScore: Math.round(fairnessScore * 1000) / 1000,
    sniperResistanceScore: Math.min(100, Math.max(0, sniperResistanceScore)),
    creatorRevenueQuote: totalCreatorFee.toString(),
    protocolFeeTakeQuote: totalProtocolFee.toString(),
    partnerRevenueQuote: totalPartnerFee.toString(),
  };
}

// --- Preset Scenario Generators ---

export const Scenarios = {
  whaleEntry(whaleQuoteAmount: BN, retailSteps = 10, retailBuyQuote: BN): TradeInput[] {
    const trades: TradeInput[] = [];
    // 1. Whale buys early with large size
    trades.push({ direction: "buy", amount: whaleQuoteAmount, walletId: "whale_1" });
    // 2. Retail trades follow
    for (let i = 0; i < retailSteps; i++) {
      trades.push({ direction: "buy", amount: retailBuyQuote, walletId: `retail_${i}` });
    }
    return trades;
  },

  botSniping(sniperCount = 3, sniperAmount: BN, regularAmount: BN): TradeInput[] {
    const trades: TradeInput[] = [];
    // Snipers in block 0
    for (let i = 0; i < sniperCount; i++) {
      trades.push({ direction: "buy", amount: sniperAmount, walletId: `bot_sniper_${i}` });
    }
    // Organic users enter
    for (let i = 0; i < 5; i++) {
      trades.push({ direction: "buy", amount: regularAmount, walletId: `user_${i}` });
    }
    // Snipers dump
    for (let i = 0; i < sniperCount; i++) {
      trades.push({ direction: "sell", amount: new BN(1_000_000_000), walletId: `bot_sniper_${i}` });
    }
    return trades;
  },

  organicFlow(totalSteps = 20, averageQuoteBuy: BN): TradeInput[] {
    const trades: TradeInput[] = [];
    for (let i = 0; i < totalSteps; i++) {
      // 80% buys, 20% sells
      if (i > 3 && i % 5 === 0) {
        trades.push({ direction: "sell", amount: new BN(50_000_000), walletId: `trader_${i % 4}` });
      } else {
        trades.push({ direction: "buy", amount: averageQuoteBuy, walletId: `trader_${i}` });
      }
    }
    return trades;
  },

  panicSell(preBuySteps = 10, buyAmount: BN): TradeInput[] {
    const trades: TradeInput[] = [];
    for (let i = 0; i < preBuySteps; i++) {
      trades.push({ direction: "buy", amount: buyAmount, walletId: `holder_${i}` });
    }
    // Cascade sells
    for (let i = 0; i < preBuySteps; i++) {
      trades.push({ direction: "sell", amount: new BN(200_000_000), walletId: `holder_${i}` });
    }
    return trades;
  },

  washTradeLoop(washRounds = 5, washAmount: BN): TradeInput[] {
    const trades: TradeInput[] = [];
    for (let i = 0; i < washRounds; i++) {
      trades.push({ direction: "buy", amount: washAmount, walletId: "wash_trader_1" });
      trades.push({ direction: "sell", amount: new BN(100_000_000), walletId: "wash_trader_1" });
    }
    return trades;
  },
};
