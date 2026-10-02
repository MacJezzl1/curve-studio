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

export const rwaLongTailPreset: CurvePreset = {
  id: "rwa-long-tail",
  name: "RWA Long-Tail Capital Pool",
  tagline: "Shallow accumulation phase, deep reserve backing, and ongoing custody fee sharing.",
  category: "rwa",
  description:
    "Tailored for illiquid real-world assets: fractional real estate, fine art, private credit notes, and intellectual property/music royalties. Features an extended shallow accumulation curve and dedicated creator fee streaming for ongoing legal, appraisal, and custodial operations.",
  rationale:
    "RWAs need deep capital reserves before public market trading to reflect intrinsic asset valuation. The curve uses an extended 4-segment shape with a shallow slope across the first 60% of volume, allowing accredited and retail collectors to accumulate steadily. 15% of trading fees are continuously routed to the verified asset custodian to finance ongoing compliance, audits, and insurance.",
  recommendedQuoteToken: "USDC",
  targetAudience: "Fractional real estate sponsors, art tokenization protocols, private credit syndicates, and IP royalty trusts.",
  keyMechanics: [
    "4-segment convex curve with gentle early slope (steepness exponent 0.8)",
    "Substantial quote graduation threshold guaranteeing deep reserve backing",
    "15% creator trading fee share for custodian/appraisal maintenance",
    "DAMM v2 post-migration pool with 50 bps fee tier",
    "85% permanent LP lock + 15% creator locked LP",
  ],
  builderParams: {
    token: {
      tokenType: TokenType.SPLToken,
      baseDecimals: 6,
      quoteDecimals: 6, // USDC 6 decimals
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: "1000000000000", // 1,000,000 tokens * 10^6
      leftover: "1000",
    },
    curve: {
      startPrice: 1.0, // $1.00 USDC par value
      migrationPrice: 3.5, // $3.50 USDC graduation cap
      migrationTargetPercentage: 30, // 30% of supply
      numSegments: 4,
      steepnessExponent: 0.8,
    },
    fee: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      startingFeeBps: 30, // 30 bps
      endingFeeBps: 30,
      numberOfPeriod: 0,
      totalDuration: 0,
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 15, // 15% of fees to asset manager
      poolCreationFee: "0",
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      feePercentage: 0,
      creatorFeePercentage: 0,
      migratedPoolFee: {
        poolFeeBps: 50,
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 85,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 15,
    },
    activationType: ActivationType.Timestamp,
  },
  simulationScenario: [
    { direction: "buy", amount: "25000000000", label: "Anchor LP Subscription ($25,000 USDC)" },
    { direction: "buy", amount: "50000000000", label: "Syndicate Tranche A ($50,000 USDC)" },
    { direction: "buy", amount: "100000000000", label: "Syndicate Tranche B ($100,000 USDC)" },
    { direction: "sell", amount: "20000000000", label: "Early Liquidity Rebalance" },
  ],
  migrationPlan: {
    target: "DAMM_V2",
    poolFeeBps: 50,
    permanentLockedPercentage: 85,
    creatorFeeSharePercentage: 15,
  },
  tags: ["rwa", "real-estate", "credit", "custody", "compliance", "institutional"],
};
