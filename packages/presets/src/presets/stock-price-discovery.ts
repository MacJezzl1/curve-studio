import { CurvePreset } from "../schema.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenType,
  TokenAuthorityOption,
  MigratedCollectFeeMode,
  DammV2DynamicFeeMode,
  DammV2BaseFeeMode,
} from "@curve-studio/core";

export const stockPriceDiscoveryPreset: CurvePreset = {
  id: "stock-price-discovery",
  name: "xStock / Equity Price Discovery",
  tagline: "Tight spreads, gentle slope, and deep permanent liquidity for tokenized equities.",
  category: "equity",
  description:
    "Engineered specifically for tokenized equities, synthetic stocks, and institutional RWAs. Replaces high-volatility meme dynamics with continuous, deep liquidity bands, low slippage, and tight 25 bps trading fees.",
  rationale:
    "Institutional assets require predictable price execution and fair price discovery. Rather than punishing early participants with predatory anti-snipe fees, this preset maintains a uniform 25 bps fee and a gentle 2.5x price discovery corridor over a 25% supply float. At graduation, 100% of protocol LP is permanently locked into a DAMM v2 25 bps pool to guarantee ongoing market stability.",
  recommendedQuoteToken: "USDC",
  targetAudience: "Tokenized real-world equities, commodity tokens, synthetic assets, and treasury shares.",
  keyMechanics: [
    "Gentle 2-segment curve with exponent 1.0 (smooth linear transition)",
    "Flat 25 bps trading fee (Meteora minimum fee tier)",
    "Wide 25% float distribution prior to graduation",
    "100% permanent lock on DAMM v2 migration LP (zero rug risk)",
    "Fixed 25 bps post-migration DAMM v2 pool fee tier",
  ],
  builderParams: {
    token: {
      tokenType: TokenType.SPLToken,
      baseDecimals: 6,
      quoteDecimals: 6, // USDC 6 decimals
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: "10000000000000", // 10,000,000 tokens * 10^6
      leftover: "1000",
    },
    curve: {
      startPrice: 10.0, // $10.00 USDC
      migrationPrice: 25.0, // $25.00 USDC
      migrationTargetPercentage: 25,
      numSegments: 2,
      steepnessExponent: 1.0,
    },
    fee: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      startingFeeBps: 25,
      endingFeeBps: 25,
      numberOfPeriod: 0,
      totalDuration: 0,
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 0,
      poolCreationFee: "0",
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      feePercentage: 0,
      creatorFeePercentage: 0,
      migratedPoolFee: {
        poolFeeBps: 25,
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
    activationType: ActivationType.Timestamp,
  },
  simulationScenario: [
    { direction: "buy", amount: "50000000000", label: "Initial Seed Allocation ($50,000 USDC)" },
    { direction: "buy", amount: "100000000000", label: "Institutional Block Purchase ($100,000 USDC)" },
    { direction: "sell", amount: "5000000000", label: "Rebalancing Sell (5,000 Base Tokens)" },
    { direction: "buy", amount: "250000000000", label: "Secondary Accumulation ($250,000 USDC)" },
  ],
  migrationPlan: {
    target: "DAMM_V2",
    poolFeeBps: 25,
    permanentLockedPercentage: 100,
    creatorFeeSharePercentage: 0,
  },
  tags: ["rwa", "equity", "stocks", "institutional", "low-fee", "permanent-lp"],
};
