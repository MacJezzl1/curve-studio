import { z } from "zod";
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

export const PresetCategorySchema = z.enum([
  "equity",
  "meme",
  "rwa",
  "agent",
  "conviction",
]);
export type PresetCategory = z.infer<typeof PresetCategorySchema>;

export const MigrationTargetSchema = z.enum(["DAMM_V2", "DAMM_V2_PLUS_DLMM"]);
export type MigrationTarget = z.infer<typeof MigrationTargetSchema>;

export const DlmmConvictionConfigSchema = z.object({
  binStep: z.number().int().positive(),
  feeBps: z.number().int().nonnegative(),
  distributionRatio: z.number().min(0).max(100), // e.g. 20% of post-graduation liquidity into DLMM
  stakerLockDays: z.number().int().nonnegative(),
  strategy: z.enum(["SpotBalanced", "Curve", "BidAsk", "SingleSidedToken"]),
});
export type DlmmConvictionConfig = z.infer<typeof DlmmConvictionConfigSchema>;

export const SimulationTradeSchema = z.object({
  direction: z.enum(["buy", "sell"]),
  amount: z.string(), // in raw base/quote units as string for precision
  label: z.string().optional(),
});
export type SimulationTrade = z.infer<typeof SimulationTradeSchema>;

export const CurvePresetBuilderParamsSchema = z.object({
  token: z.object({
    tokenType: z.nativeEnum(TokenType).default(TokenType.SPLToken),
    baseDecimals: z.number().int().min(0).max(18).default(6),
    quoteDecimals: z.number().int().min(0).max(18).default(9),
    tokenAuthorityOption: z.nativeEnum(TokenAuthorityOption).default(TokenAuthorityOption.Immutable),
    totalTokenSupply: z.string(), // raw base units
    leftover: z.string().default("1000"),
  }),
  curve: z.object({
    startPrice: z.number().positive(),
    migrationPrice: z.number().positive(),
    migrationTargetPercentage: z.number().min(1).max(99).default(20),
    numSegments: z.number().int().min(1).max(16).default(2),
    steepnessExponent: z.number().positive().default(1.0),
  }),
  fee: z.object({
    baseFeeMode: z.nativeEnum(BaseFeeMode).default(BaseFeeMode.FeeSchedulerLinear),
    startingFeeBps: z.number().int().min(1).max(10000),
    endingFeeBps: z.number().int().min(1).max(10000),
    numberOfPeriod: z.number().int().nonnegative().default(0),
    totalDuration: z.number().int().nonnegative().default(0),
    dynamicFeeEnabled: z.boolean().default(false),
    collectFeeMode: z.nativeEnum(CollectFeeMode).default(CollectFeeMode.QuoteToken),
    creatorTradingFeePercentage: z.number().int().min(0).max(100).default(0),
    poolCreationFee: z.string().default("0"),
    enableFirstSwapWithMinFee: z.boolean().default(false),
  }),
  migration: z.object({
    migrationOption: z.nativeEnum(MigrationOption).default(MigrationOption.MET_DAMM_V2),
    migrationFeeOption: z.nativeEnum(MigrationFeeOption).default(MigrationFeeOption.Customizable),
    feePercentage: z.number().int().min(0).max(100).default(0),
    creatorFeePercentage: z.number().int().min(0).max(100).default(0),
    migratedPoolFee: z.object({
      poolFeeBps: z.number().int().min(1).max(10000),
      collectFeeMode: z.nativeEnum(MigratedCollectFeeMode).default(MigratedCollectFeeMode.QuoteToken),
      dynamicFee: z.nativeEnum(DammV2DynamicFeeMode).default(DammV2DynamicFeeMode.Disabled),
      baseFeeMode: z.nativeEnum(DammV2BaseFeeMode).default(DammV2BaseFeeMode.FeeTimeSchedulerLinear),
    }),
  }),
  liquidityDistribution: z.object({
    partnerLiquidityPercentage: z.number().int().min(0).max(100).default(0),
    partnerPermanentLockedLiquidityPercentage: z.number().int().min(0).max(100).default(100),
    creatorLiquidityPercentage: z.number().int().min(0).max(100).default(0),
    creatorPermanentLockedLiquidityPercentage: z.number().int().min(0).max(100).default(0),
  }),
  activationType: z.nativeEnum(ActivationType).default(ActivationType.Timestamp),
});
export type CurvePresetBuilderParams = z.infer<typeof CurvePresetBuilderParamsSchema>;

export const CurvePresetSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  tagline: z.string().min(1),
  category: PresetCategorySchema,
  description: z.string().min(10),
  rationale: z.string().min(10),
  recommendedQuoteToken: z.enum(["SOL", "USDC"]),
  targetAudience: z.string(),
  keyMechanics: z.array(z.string()).min(1),
  builderParams: CurvePresetBuilderParamsSchema,
  simulationScenario: z.array(SimulationTradeSchema).min(1),
  migrationPlan: z.object({
    target: MigrationTargetSchema,
    poolFeeBps: z.number(),
    permanentLockedPercentage: z.number(),
    creatorFeeSharePercentage: z.number(),
    dlmmConfig: DlmmConvictionConfigSchema.optional(),
  }),
  tags: z.array(z.string()),
});
export type CurvePreset = z.infer<typeof CurvePresetSchema>;
