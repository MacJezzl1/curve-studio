import { z } from "zod";
import BN from "bn.js";

// --- Enums matching Meteora DBC & DAMM v2 on-chain values ---

export enum TokenType {
  SPLToken = 0,
  Token2022 = 1,
}

export enum ActivationType {
  Slot = 0,
  Timestamp = 1,
}

export enum CollectFeeMode {
  QuoteToken = 0,
  OutputToken = 1,
}

export enum MigratedCollectFeeMode {
  QuoteToken = 0,
  OutputToken = 1,
  Compounding = 2,
}

export enum BaseFeeMode {
  FeeSchedulerLinear = 0,
  FeeSchedulerExponential = 1,
  RateLimiter = 2, // Deprecated for new pools
}

export enum DammV2BaseFeeMode {
  FeeTimeSchedulerLinear = 0,
  FeeTimeSchedulerExponential = 1,
  RateLimiter = 2,
  FeeMarketCapSchedulerLinear = 3,
  FeeMarketCapSchedulerExponential = 4,
}

export enum DammV2DynamicFeeMode {
  Disabled = 0,
  Enabled = 1,
}

export enum MigrationOption {
  MET_DAMM = 0, // Deprecated
  MET_DAMM_V2 = 1,
}

export enum MigrationFeeOption {
  FixedBps25 = 0,
  FixedBps30 = 1,
  FixedBps100 = 2,
  FixedBps200 = 3,
  FixedBps400 = 4,
  FixedBps600 = 5,
  Customizable = 6,
}

export enum TokenAuthorityOption {
  CreatorUpdateAuthority = 0,
  Immutable = 1,
  PartnerUpdateAuthority = 2,
  CreatorUpdateAndMintAuthority = 3,
  PartnerUpdateAndMintAuthority = 4,
}

export enum CurveFamily {
  Flat = "flat",
  Exponential = "exponential",
  LongTail = "long-tail",
  Stepped = "stepped",
  Custom = "custom",
}

// --- Zod Schemas for Validation & Serialization ---

export const FeeSchedulerParamsSchema = z.object({
  startingFeeBps: z.number().int().min(25).max(9900),
  endingFeeBps: z.number().int().min(25).max(9900),
  numberOfPeriod: z.number().int().min(0),
  totalDuration: z.number().int().min(0),
});

export type FeeSchedulerParams = z.infer<typeof FeeSchedulerParamsSchema>;

export const FeeConfigSchema = z.object({
  baseFeeMode: z.nativeEnum(BaseFeeMode),
  feeSchedulerParam: FeeSchedulerParamsSchema,
  dynamicFeeEnabled: z.boolean().default(false),
  collectFeeMode: z.nativeEnum(CollectFeeMode).default(CollectFeeMode.QuoteToken),
  creatorTradingFeePercentage: z.number().min(0).max(100).default(0),
  poolCreationFee: z.string().default("0"), // in lamports (string to avoid float precision loss)
  enableFirstSwapWithMinFee: z.boolean().default(false),
});

export type FeeConfig = z.infer<typeof FeeConfigSchema>;

export const MigratedPoolFeeSchema = z.object({
  collectFeeMode: z.nativeEnum(MigratedCollectFeeMode).default(MigratedCollectFeeMode.QuoteToken),
  dynamicFee: z.nativeEnum(DammV2DynamicFeeMode).default(DammV2DynamicFeeMode.Disabled),
  poolFeeBps: z.number().int().min(10).max(1000).default(100),
  baseFeeMode: z.nativeEnum(DammV2BaseFeeMode).default(DammV2BaseFeeMode.FeeTimeSchedulerLinear),
  compoundingFeeBps: z.number().int().min(0).max(10000).default(0),
});

export type MigratedPoolFee = z.infer<typeof MigratedPoolFeeSchema>;

export const MigrationConfigSchema = z.object({
  migrationOption: z.nativeEnum(MigrationOption).default(MigrationOption.MET_DAMM_V2),
  migrationFeeOption: z.nativeEnum(MigrationFeeOption).default(MigrationFeeOption.Customizable),
  feePercentage: z.number().min(0).max(99).default(0),
  creatorFeePercentage: z.number().min(0).max(100).default(0),
  migratedPoolFee: MigratedPoolFeeSchema,
});

export type MigrationConfig = z.infer<typeof MigrationConfigSchema>;

export const LiquidityDistributionSchema = z.object({
  partnerLiquidityPercentage: z.number().min(0).max(100).default(0),
  partnerPermanentLockedLiquidityPercentage: z.number().min(0).max(100).default(100),
  partnerVestingLiquidityPercentage: z.number().min(0).max(100).default(0),
  creatorLiquidityPercentage: z.number().min(0).max(100).default(0),
  creatorPermanentLockedLiquidityPercentage: z.number().min(0).max(100).default(0),
  creatorVestingLiquidityPercentage: z.number().min(0).max(100).default(0),
});

export type LiquidityDistribution = z.infer<typeof LiquidityDistributionSchema>;

export const TokenConfigSchema = z.object({
  tokenType: z.nativeEnum(TokenType).default(TokenType.SPLToken),
  baseDecimals: z.number().int().min(6).max(9).default(6),
  quoteDecimals: z.number().int().min(6).max(9).default(9),
  tokenAuthorityOption: z.nativeEnum(TokenAuthorityOption).default(TokenAuthorityOption.Immutable),
  totalTokenSupply: z.string(), // raw token integer amount (string)
  leftover: z.string().default("1000"), // minimum leftover buffer
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;

export interface CurvePoint {
  price: number; // Human-readable UI price (quote per base)
  sqrtPrice: BN; // Q64.64 sqrtPrice format used by Solana DBC program
  liquidity: BN; // Virtual liquidity L
  cumulativeBase: BN; // Cumulative base tokens sold up to this point
  cumulativeQuote: BN; // Cumulative quote tokens raised up to this point
}

export interface CurveSegment {
  index: number;
  lowerSqrtPrice: BN;
  upperSqrtPrice: BN;
  liquidity: BN;
  baseAmount: BN;
  quoteAmount: BN;
}

export interface DBCConfig {
  version: string;
  name: string;
  curveFamily: CurveFamily;
  token: TokenConfig;
  fee: FeeConfig;
  migration: MigrationConfig;
  liquidityDistribution: LiquidityDistribution;
  activationType: ActivationType;
  points: CurvePoint[];
  segments: CurveSegment[];
  migrationQuoteThreshold: BN;
  initialPrice: number;
  migrationPrice: number;
  creatorTradingFeePercentage: number;
}

// --- Validator Diagnostics ---

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
  suggestedFix: string;
}

export interface ValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// --- Simulation Types ---

export type TradeDirection = "buy" | "sell";

export interface TradeInput {
  direction: TradeDirection;
  amount: BN; // Quote amount for buy, Base amount for sell
  walletId?: string;
}

export interface TradeStepResult {
  step: number;
  direction: TradeDirection;
  walletId: string;
  amountIn: BN;
  amountOut: BN;
  spotPriceBefore: number;
  spotPriceAfter: number;
  effectivePrice: number;
  priceImpactBps: number;
  feeTotal: BN;
  feeProtocol: BN;
  feePartner: BN;
  feeCreator: BN;
  quoteReserve: BN;
  baseReserve: BN;
  graduated: boolean;
}

export interface SimulationResult {
  steps: TradeStepResult[];
  initialPrice: number;
  finalPrice: number;
  peakPrice: number;
  totalVolumeQuote: BN;
  totalFeesProtocol: BN;
  totalFeesCreator: BN;
  totalFeesPartner: BN;
  isGraduated: boolean;
  graduationStep: number | null;
  quoteProgressPercent: number;
  baseProgressPercent: number;
  walletBalances: Record<string, { base: BN; quoteSpent: BN }>;
  metrics: SimulationMetrics;
}

export interface SimulationMetrics {
  effectiveAverageEntryPrice: number;
  maxDrawdownPercent: number;
  fairnessScore: number; // 0 to 1 (1 = optimal distribution)
  sniperResistanceScore: number; // 0 to 100
  creatorRevenueQuote: string;
  protocolFeeTakeQuote: string;
  partnerRevenueQuote: string;
}
