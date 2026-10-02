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

export const convictionPoolPreset: CurvePreset = {
  id: "conviction-pool",
  name: "Dual-Stage Conviction Staking Pool",
  tagline: "DBC graduation into DAMM v2 anchor liquidity plus secondary DLMM concentrated conviction bins.",
  category: "conviction",
  description:
    "A premier DeFi mechanism combining DBC dynamic bonding curves with dual-stage graduation. Post-graduation, base liquidity locks permanently into DAMM v2 for global depth, while a secondary allocation seeds a Meteora DLMM concentrated pool designed for time-locked conviction staking and dynamic bin fee capture.",
  rationale:
    "Long-term protocols suffer when speculators treat graduation as an exit event. This preset creates an aligned graduation destination: DAMM v2 anchors the baseline market price with 100% permanent locked liquidity, while a dedicated Meteora DLMM concentrated conviction pool provides high-efficiency yield bins for diamond-hand stakers who commit capital for 30+ days.",
  recommendedQuoteToken: "SOL",
  targetAudience: "DeFi protocols, governance tokens, long-term infrastructure DAOs, and staked liquidity networks.",
  keyMechanics: [
    "Dual-destination architecture: DAMM v2 anchor depth + DLMM concentrated yield bins",
    "Linear decaying fee on curve (100 bps down to 50 bps over 30 mins) to reward patience",
    "100% permanent lock on DAMM v2 LP tokens to eliminate pull risks",
    "Secondary DLMM pool with 20 bin step and 25 bps fee optimized for concentrated stakers",
    "3-segment progressive bonding curve with steepness exponent 1.15",
  ],
  builderParams: {
    token: {
      tokenType: TokenType.SPLToken,
      baseDecimals: 6,
      quoteDecimals: 9, // SOL 9 decimals
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: "500000000000000", // 500,000,000 tokens * 10^6
      leftover: "1000",
    },
    curve: {
      startPrice: 0.0000001, // 0.0000001 SOL
      migrationPrice: 0.000001, // 10x graduation target
      migrationTargetPercentage: 25,
      numSegments: 3,
      steepnessExponent: 1.15,
    },
    fee: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      startingFeeBps: 100, // 100 bps
      endingFeeBps: 50, // 50 bps
      numberOfPeriod: 6,
      totalDuration: 1800, // 30 minutes
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 10, // 10% to governance treasury
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
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
    activationType: ActivationType.Timestamp,
  },
  simulationScenario: [
    { direction: "buy", amount: "15000000000", label: "Founding Staker Allocation (15 SOL)" },
    { direction: "buy", amount: "40000000000", label: "DAO Treasury Participation (40 SOL)" },
    { direction: "sell", amount: "20000000000000", label: "Speculator Exit Before Graduation" },
    { direction: "buy", amount: "75000000000", label: "Conviction Accumulation (75 SOL)" },
  ],
  migrationPlan: {
    target: "DAMM_V2_PLUS_DLMM",
    poolFeeBps: 50,
    permanentLockedPercentage: 100,
    creatorFeeSharePercentage: 10,
    dlmmConfig: {
      binStep: 20,
      feeBps: 25,
      distributionRatio: 25, // 25% allocated to DLMM concentrated conviction bins
      stakerLockDays: 30,
      strategy: "SpotBalanced",
    },
  },
  tags: ["conviction", "dlmm", "dual-stage", "staking", "dao", "yield", "defi"],
};
