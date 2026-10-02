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

export const fairMemePreset: CurvePreset = {
  id: "fair-meme",
  name: "Fair-Launch Anti-Snipe Community Meme",
  tagline: "Decaying fee scheduler and 100% locked LP for maximum sniper resistance.",
  category: "meme",
  description:
    "Engineered for high-velocity community tokens and meme coins. Neutralizes MEV bots and bundle snipers via an aggressive 500 bps (5%) launch fee that decays linearly to 100 bps over 15 minutes, directing all sniper friction into protocol liquidity.",
  rationale:
    "Meme coin launches suffer from first-block cartels who buy 30%+ of the curve in slot 0 and dump on organic users. By combining a 500 bps starting fee schedule with a multi-segment curve and a 20% migration target, snipers face immediate 5% slippage on entry. 100% of the LP generated at graduation is permanently locked in DAMM v2 with dynamic volatility fees enabled, ensuring continuous trading without liquidity extraction.",
  recommendedQuoteToken: "SOL",
  targetAudience: "Community tokens, meme coins, viral cultural movements, and fair-launch DAOs.",
  keyMechanics: [
    "500 bps (5%) starting fee decaying linearly to 100 bps (1%) over 900 seconds (15 mins)",
    "Anti-snipe fee capture routes quote volume directly toward graduation",
    "2-segment progressive curve with steepness exponent 1.25",
    "100% permanent lock on DAMM v2 migration LP (zero creator liquidity pull)",
    "DAMM v2 dynamic volatility fee tier enabled post-migration",
  ],
  builderParams: {
    token: {
      tokenType: TokenType.SPLToken,
      baseDecimals: 6,
      quoteDecimals: 9, // SOL 9 decimals
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: "1000000000000000", // 1,000,000,000 tokens * 10^6
      leftover: "1000",
    },
    curve: {
      startPrice: 0.00000003, // ~0.00000003 SOL per token (~$0.000005)
      migrationPrice: 0.0000003, // 10x launch price discovery (~$0.00005)
      migrationTargetPercentage: 20,
      numSegments: 2,
      steepnessExponent: 1.25,
    },
    fee: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      startingFeeBps: 500, // 5%
      endingFeeBps: 100, // 1%
      numberOfPeriod: 15,
      totalDuration: 900, // 15 minutes
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
        poolFeeBps: 100,
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Enabled,
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
    { direction: "buy", amount: "5000000000", label: "Sniper Attempt (5 SOL @ 5% fee)" },
    { direction: "buy", amount: "10000000000", label: "Community Wave 1 (10 SOL)" },
    { direction: "sell", amount: "15000000000000", label: "Early Take-Profit Sell" },
    { direction: "buy", amount: "30000000000", label: "FOMO Wave 2 (30 SOL)" },
  ],
  migrationPlan: {
    target: "DAMM_V2",
    poolFeeBps: 100,
    permanentLockedPercentage: 100,
    creatorFeeSharePercentage: 0,
  },
  tags: ["meme", "anti-snipe", "fair-launch", "decaying-fees", "solana", "viral"],
};
