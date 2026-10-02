import BN from "bn.js";
import Decimal from "decimal.js";
import {
  CurvePoint,
  CurveSegment,
  CurveFamily,
} from "./types.js";
import {
  priceToSqrtPrice,
  getBaseAmountForLiquidity,
  getQuoteAmountForLiquidity,
  getLiquidityForBaseAmount,
} from "./math.js";

export interface CurveGenerationParams {
  family: CurveFamily;
  initialPrice: number;
  graduationPrice: number;
  tokenSupply: BN; // Total supply allocated to bonding curve
  baseDecimals?: number;
  quoteDecimals?: number;
  segmentsCount?: number;
  // Specific family parameters
  pivotPrice?: number; // for long-tail
  pivotSupplyRatio?: number; // for long-tail (e.g. 0.75)
  tranchesCount?: number; // for stepped
  customPoints?: { price: number; supplyShare: number }[]; // for custom
}

export function generateCurve(params: CurveGenerationParams): {
  points: CurvePoint[];
  segments: CurveSegment[];
  migrationQuoteThreshold: BN;
} {
  switch (params.family) {
    case CurveFamily.Flat:
      return generateFlatCurve(params);
    case CurveFamily.Exponential:
      return generateExponentialCurve(params);
    case CurveFamily.LongTail:
      return generateLongTailCurve(params);
    case CurveFamily.Stepped:
      return generateSteppedCurve(params);
    case CurveFamily.Custom:
      return generateCustomCurve(params);
    default:
      throw new Error(`Unsupported curve family: ${params.family}`);
  }
}

/**
 * Flat Curve: minimal price slippage across the distribution.
 * Price gently drifts from initialPrice to initialPrice * 1.05 (or target graduationPrice).
 */
export function generateFlatCurve(params: CurveGenerationParams) {
  const { initialPrice, tokenSupply, baseDecimals = 6, quoteDecimals = 9 } = params;
  const graduationPrice = params.graduationPrice || initialPrice * 1.10;
  const segmentsCount = params.segmentsCount || 4;

  const priceStep = (graduationPrice - initialPrice) / segmentsCount;
  const basePerSegment = tokenSupply.div(new BN(segmentsCount));

  const points: CurvePoint[] = [];
  const segments: CurveSegment[] = [];
  let cumBase = new BN(0);
  let cumQuote = new BN(0);

  let currentSqrtPrice = priceToSqrtPrice(initialPrice, baseDecimals, quoteDecimals);
  points.push({
    price: initialPrice,
    sqrtPrice: currentSqrtPrice,
    liquidity: new BN(0),
    cumulativeBase: new BN(0),
    cumulativeQuote: new BN(0),
  });

  for (let i = 0; i < segmentsCount; i++) {
    const nextPrice = initialPrice + priceStep * (i + 1);
    const nextSqrtPrice = priceToSqrtPrice(nextPrice, baseDecimals, quoteDecimals);
    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextSqrtPrice, basePerSegment);
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: i,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: nextSqrtPrice,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: nextPrice,
      sqrtPrice: nextSqrtPrice,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = nextSqrtPrice;
  }

  return {
    points,
    segments,
    migrationQuoteThreshold: cumQuote,
  };
}

/**
 * Exponential Curve: classic bonding curve where marginal price grows geometrically.
 * P(i) = P_0 * (P_grad / P_0)^(i / N)
 */
export function generateExponentialCurve(params: CurveGenerationParams) {
  const {
    initialPrice,
    graduationPrice,
    tokenSupply,
    baseDecimals = 6,
    quoteDecimals = 9,
    segmentsCount = 6,
  } = params;

  if (graduationPrice <= initialPrice) {
    throw new Error(`Graduation price (${graduationPrice}) must exceed initial price (${initialPrice})`);
  }

  const ratio = Math.pow(graduationPrice / initialPrice, 1 / segmentsCount);
  const basePerSegment = tokenSupply.div(new BN(segmentsCount));

  const points: CurvePoint[] = [];
  const segments: CurveSegment[] = [];
  let cumBase = new BN(0);
  let cumQuote = new BN(0);

  let currentSqrtPrice = priceToSqrtPrice(initialPrice, baseDecimals, quoteDecimals);
  points.push({
    price: initialPrice,
    sqrtPrice: currentSqrtPrice,
    liquidity: new BN(0),
    cumulativeBase: new BN(0),
    cumulativeQuote: new BN(0),
  });

  for (let i = 0; i < segmentsCount; i++) {
    const nextPrice = initialPrice * Math.pow(ratio, i + 1);
    const nextSqrtPrice = priceToSqrtPrice(nextPrice, baseDecimals, quoteDecimals);
    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextSqrtPrice, basePerSegment);
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: i,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: nextSqrtPrice,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: nextPrice,
      sqrtPrice: nextSqrtPrice,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = nextSqrtPrice;
  }

  return {
    points,
    segments,
    migrationQuoteThreshold: cumQuote,
  };
}

/**
 * Long-Tail Curve: shallow accumulation curve for 70-80% of supply, steepening into graduation.
 */
export function generateLongTailCurve(params: CurveGenerationParams) {
  const {
    initialPrice,
    graduationPrice,
    tokenSupply,
    baseDecimals = 6,
    quoteDecimals = 9,
    pivotSupplyRatio = 0.75, // 75% of tokens in shallow phase
  } = params;

  const pivotPrice = params.pivotPrice || initialPrice * 2.0;
  const shallowSegments = 4;
  const steepSegments = 4;

  const shallowSupply = new Decimal(tokenSupply.toString()).mul(pivotSupplyRatio).floor();
  const steepSupply = new Decimal(tokenSupply.toString()).sub(shallowSupply);

  const basePerShallow = new BN(shallowSupply.div(shallowSegments).toFixed(0));
  const basePerSteep = new BN(steepSupply.div(steepSegments).toFixed(0));

  const points: CurvePoint[] = [];
  const segments: CurveSegment[] = [];
  let cumBase = new BN(0);
  let cumQuote = new BN(0);

  let currentSqrtPrice = priceToSqrtPrice(initialPrice, baseDecimals, quoteDecimals);
  points.push({
    price: initialPrice,
    sqrtPrice: currentSqrtPrice,
    liquidity: new BN(0),
    cumulativeBase: new BN(0),
    cumulativeQuote: new BN(0),
  });

  // Phase 1: Shallow accumulation
  const shallowPriceStep = (pivotPrice - initialPrice) / shallowSegments;
  for (let i = 0; i < shallowSegments; i++) {
    const nextPrice = initialPrice + shallowPriceStep * (i + 1);
    const nextSqrtPrice = priceToSqrtPrice(nextPrice, baseDecimals, quoteDecimals);
    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextSqrtPrice, basePerShallow);
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: segments.length,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: nextSqrtPrice,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: nextPrice,
      sqrtPrice: nextSqrtPrice,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = nextSqrtPrice;
  }

  // Phase 2: Steep graduation climb
  const steepRatio = Math.pow(graduationPrice / pivotPrice, 1 / steepSegments);
  for (let i = 0; i < steepSegments; i++) {
    const nextPrice = pivotPrice * Math.pow(steepRatio, i + 1);
    const nextSqrtPrice = priceToSqrtPrice(nextPrice, baseDecimals, quoteDecimals);
    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextSqrtPrice, basePerSteep);
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: segments.length,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: nextSqrtPrice,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: nextPrice,
      sqrtPrice: nextSqrtPrice,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = nextSqrtPrice;
  }

  return {
    points,
    segments,
    migrationQuoteThreshold: cumQuote,
  };
}

/**
 * Stepped Curve: tranches of flat price discovery connected by steep steps.
 */
export function generateSteppedCurve(params: CurveGenerationParams) {
  const {
    initialPrice,
    graduationPrice,
    tokenSupply,
    baseDecimals = 6,
    quoteDecimals = 9,
    tranchesCount = 3,
  } = params;

  const points: CurvePoint[] = [];
  const segments: CurveSegment[] = [];
  let cumBase = new BN(0);
  let cumQuote = new BN(0);

  const priceLevels: number[] = [];
  for (let i = 0; i < tranchesCount; i++) {
    priceLevels.push(initialPrice + ((graduationPrice - initialPrice) * i) / (tranchesCount - 1));
  }

  const basePerTranche = tokenSupply.div(new BN(tranchesCount));
  let currentSqrtPrice = priceToSqrtPrice(initialPrice, baseDecimals, quoteDecimals);

  points.push({
    price: initialPrice,
    sqrtPrice: currentSqrtPrice,
    liquidity: new BN(0),
    cumulativeBase: new BN(0),
    cumulativeQuote: new BN(0),
  });

  for (let i = 0; i < tranchesCount; i++) {
    // Within tranche: slight upward drift of 3%
    const currentLevel = priceLevels[i]!;
    const trancheEndPrice = currentLevel * 1.03;
    const trancheEndSqrt = priceToSqrtPrice(trancheEndPrice, baseDecimals, quoteDecimals);

    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, trancheEndSqrt, basePerTranche);
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, trancheEndSqrt, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, trancheEndSqrt, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: segments.length,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: trancheEndSqrt,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: trancheEndPrice,
      sqrtPrice: trancheEndSqrt,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = trancheEndSqrt;

    // Transition step to next tranche (if not last)
    if (i < tranchesCount - 1) {
      const nextLevel = priceLevels[i + 1]!;
      const nextLevelSqrt = priceToSqrtPrice(nextLevel, baseDecimals, quoteDecimals);
      // Sharp step with minimal base tokens (0.5% allocation)
      const stepBase = basePerTranche.div(new BN(20));
      const stepLiquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextLevelSqrt, stepBase);
      const stepQuote = getQuoteAmountForLiquidity(currentSqrtPrice, nextLevelSqrt, stepLiquidity);
      const stepBaseActual = getBaseAmountForLiquidity(currentSqrtPrice, nextLevelSqrt, stepLiquidity);

      cumBase = cumBase.add(stepBaseActual);
      cumQuote = cumQuote.add(stepQuote);

      segments.push({
        index: segments.length,
        lowerSqrtPrice: currentSqrtPrice,
        upperSqrtPrice: nextLevelSqrt,
        liquidity: stepLiquidity,
        baseAmount: stepBaseActual,
        quoteAmount: stepQuote,
      });

      points.push({
        price: nextLevel,
        sqrtPrice: nextLevelSqrt,
        liquidity: stepLiquidity,
        cumulativeBase: cumBase,
        cumulativeQuote: cumQuote,
      });

      currentSqrtPrice = nextLevelSqrt;
    }
  }

  return {
    points,
    segments,
    migrationQuoteThreshold: cumQuote,
  };
}

/**
 * Custom Curve: generated from user-supplied checkpoints.
 */
export function generateCustomCurve(params: CurveGenerationParams) {
  const {
    initialPrice,
    tokenSupply,
    customPoints = [],
    baseDecimals = 6,
    quoteDecimals = 9,
  } = params;

  if (customPoints.length === 0) {
    throw new Error("Custom curve requires at least one target checkpoint");
  }

  const points: CurvePoint[] = [];
  const segments: CurveSegment[] = [];
  let cumBase = new BN(0);
  let cumQuote = new BN(0);

  let currentSqrtPrice = priceToSqrtPrice(initialPrice, baseDecimals, quoteDecimals);
  points.push({
    price: initialPrice,
    sqrtPrice: currentSqrtPrice,
    liquidity: new BN(0),
    cumulativeBase: new BN(0),
    cumulativeQuote: new BN(0),
  });

  for (let i = 0; i < customPoints.length; i++) {
    const cp = customPoints[i]!;
    const nextSqrtPrice = priceToSqrtPrice(cp.price, baseDecimals, quoteDecimals);
    const segmentBase = new Decimal(tokenSupply.toString()).mul(cp.supplyShare).floor();
    const liquidity = getLiquidityForBaseAmount(currentSqrtPrice, nextSqrtPrice, new BN(segmentBase.toFixed(0)));
    const quoteInSegment = getQuoteAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);
    const baseInSegment = getBaseAmountForLiquidity(currentSqrtPrice, nextSqrtPrice, liquidity);

    cumBase = cumBase.add(baseInSegment);
    cumQuote = cumQuote.add(quoteInSegment);

    segments.push({
      index: segments.length,
      lowerSqrtPrice: currentSqrtPrice,
      upperSqrtPrice: nextSqrtPrice,
      liquidity,
      baseAmount: baseInSegment,
      quoteAmount: quoteInSegment,
    });

    points.push({
      price: cp.price,
      sqrtPrice: nextSqrtPrice,
      liquidity,
      cumulativeBase: cumBase,
      cumulativeQuote: cumQuote,
    });

    currentSqrtPrice = nextSqrtPrice;
  }

  return {
    points,
    segments,
    migrationQuoteThreshold: cumQuote,
  };
}
