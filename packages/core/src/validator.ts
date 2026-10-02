import BN from "bn.js";
import {
  DBCConfig,
  ValidationResult,
  ValidationIssue,
  BaseFeeMode,
  MigrationOption,
} from "./types.js";

export function validateConfig(config: DBCConfig): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Fee Checks
  const baseFeeMode = config.fee.baseFeeMode;
  if (baseFeeMode === BaseFeeMode.RateLimiter) {
    errors.push({
      code: "DEPRECATED_FEE_MODE",
      severity: "error",
      message: "RateLimiter base fee mode is deprecated and rejected for new Meteora DBC pools.",
      field: "fee.baseFeeMode",
      suggestedFix: "Use FeeSchedulerLinear or FeeSchedulerExponential instead.",
    });
  }

  const { startingFeeBps, endingFeeBps } = config.fee.feeSchedulerParam;
  if (startingFeeBps > 9900 || endingFeeBps > 9900) {
    errors.push({
      code: "FEE_TOO_HIGH",
      severity: "error",
      message: `Trading fee bps exceeds Meteora maximum of 9,900 bps (99%). Got starting: ${startingFeeBps}, ending: ${endingFeeBps}`,
      field: "fee.feeSchedulerParam",
      suggestedFix: "Reduce starting and ending fee to <= 9,900 bps.",
    });
  }

  if (startingFeeBps < 25 || endingFeeBps < 25) {
    errors.push({
      code: "FEE_TOO_LOW",
      severity: "error",
      message: `Trading fee bps is below Meteora minimum of 25 bps (0.25%). Got starting: ${startingFeeBps}, ending: ${endingFeeBps}`,
      field: "fee.feeSchedulerParam",
      suggestedFix: "Increase starting and ending fee to >= 25 bps.",
    });
  }

  if (startingFeeBps > 5000) {
    warnings.push({
      code: "HIGH_INITIAL_FEE",
      severity: "warning",
      message: `Initial trading fee of ${(startingFeeBps / 100).toFixed(2)}% is unusually high. Ensure fee decay duration is appropriately short to prevent deterring legitimate traders.`,
      field: "fee.feeSchedulerParam.startingFeeBps",
      suggestedFix: "Consider starting between 1,000 bps (10%) and 3,000 bps (30%) with rapid decay.",
    });
  }

  // 2. Migration Checks
  if (config.migration.migrationOption === MigrationOption.MET_DAMM) {
    errors.push({
      code: "DEPRECATED_MIGRATION_OPTION",
      severity: "error",
      message: "DAMM v1 migration is deprecated and rejected for new configs. All new launches must use DAMM v2.",
      field: "migration.migrationOption",
      suggestedFix: "Set migrationOption to MigrationOption.MET_DAMM_V2.",
    });
  }

  const migratedPoolFeeBps = config.migration.migratedPoolFee.poolFeeBps;
  if (migratedPoolFeeBps < 10 || migratedPoolFeeBps > 1000) {
    errors.push({
      code: "INVALID_MIGRATED_POOL_FEE",
      severity: "error",
      message: `Migrated DAMM v2 pool fee must be between 10 bps (0.1%) and 1,000 bps (10%). Got ${migratedPoolFeeBps} bps.`,
      field: "migration.migratedPoolFee.poolFeeBps",
      suggestedFix: "Set migrated pool fee within 10 to 1,000 bps.",
    });
  }

  // 3. Liquidity Distribution Checks
  const ld = config.liquidityDistribution;
  const totalLpPercent =
    ld.partnerLiquidityPercentage +
    ld.partnerPermanentLockedLiquidityPercentage +
    ld.partnerVestingLiquidityPercentage +
    ld.creatorLiquidityPercentage +
    ld.creatorPermanentLockedLiquidityPercentage +
    ld.creatorVestingLiquidityPercentage;

  if (totalLpPercent !== 100) {
    errors.push({
      code: "SUPPLY_ALLOCATION_MISMATCH",
      severity: "error",
      message: `Total migrated liquidity allocation must equal exactly 100%. Got ${totalLpPercent}%.`,
      field: "liquidityDistribution",
      suggestedFix: "Ensure sum of partner and creator unlocked, locked, and vesting percentages equals 100.",
    });
  }

  const lockedLp = ld.partnerPermanentLockedLiquidityPercentage + ld.creatorPermanentLockedLiquidityPercentage;
  if (lockedLp < 10) {
    errors.push({
      code: "MIGRATION_LIQUIDITY_TOO_THIN",
      severity: "error",
      message: `Meteora requires at least 10% (1,000 bps) of migrated liquidity to remain locked at Day 1. Got ${lockedLp}%.`,
      field: "liquidityDistribution",
      suggestedFix: "Allocate at least 10% to partnerPermanentLockedLiquidityPercentage or creatorPermanentLockedLiquidityPercentage.",
    });
  }

  // 4. Token & Leftover Checks
  const baseDec = config.token.baseDecimals;
  if (baseDec < 6 || baseDec > 9) {
    errors.push({
      code: "INVALID_TOKEN_DECIMALS",
      severity: "error",
      message: `Base token decimals must be between 6 and 9. Got ${baseDec}.`,
      field: "token.baseDecimals",
      suggestedFix: "Set baseDecimals to 6 or 9.",
    });
  }

  const leftover = new BN(config.token.leftover);
  if (leftover.lt(new BN(1000))) {
    warnings.push({
      code: "LEFTOVER_BUFFER_TOO_SMALL",
      severity: "warning",
      message: "Leftover buffer is under 1,000 base units. Integer rounding in curve checkpoints may trigger leftOverDelta exceptions on-chain.",
      field: "token.leftover",
      suggestedFix: "Set leftover to at least 1,000 base units.",
    });
  }

  // 5. Curve Points Checks
  if (config.points.length === 0 || config.segments.length === 0) {
    errors.push({
      code: "INVALID_CURVE_POINTS",
      severity: "error",
      message: "Curve has no checkpoints or segments.",
      field: "points",
      suggestedFix: "Generate at least one valid curve segment.",
    });
  }

  if (config.points.length > 16) {
    errors.push({
      code: "MAX_CURVE_POINTS_EXCEEDED",
      severity: "error",
      message: `Meteora DBC supports a maximum of 16 curve checkpoints (15 segments). Got ${config.points.length} points.`,
      field: "points",
      suggestedFix: "Reduce curve segments to 15 or fewer.",
    });
  }

  for (let i = 1; i < config.points.length; i++) {
    const prev = config.points[i - 1]!;
    const curr = config.points[i]!;
    if (curr.price <= prev.price) {
      errors.push({
        code: "NON_MONOTONIC_PRICE",
        severity: "error",
        message: `Curve checkpoints must have strictly increasing prices. Point ${i} price (${curr.price}) <= Point ${i - 1} price (${prev.price}).`,
        field: `points[${i}].price`,
        suggestedFix: "Ensure each successive checkpoint has a higher price than the previous checkpoint.",
      });
      break;
    }
  }

  // 6. Graduation Threshold Checks
  if (config.migrationQuoteThreshold.isZero() || config.migrationQuoteThreshold.isNeg()) {
    errors.push({
      code: "GRADUATION_UNREACHABLE",
      severity: "error",
      message: "Migration quote threshold must be strictly positive.",
      field: "migrationQuoteThreshold",
      suggestedFix: "Ensure bonding curve accumulates quote tokens to graduate.",
    });
  }

  // 7. Pool Creation Fee Check
  const creationFee = new BN(config.fee.poolCreationFee);
  if (!creationFee.isZero()) {
    const minFee = new BN(1_000_000); // 0.001 SOL
    const maxFee = new BN("100000000000"); // 100 SOL
    if (creationFee.lt(minFee) || creationFee.gt(maxFee)) {
      errors.push({
        code: "POOL_CREATION_FEE_INVALID",
        severity: "error",
        message: `Pool creation fee must be 0 or between 0.001 SOL and 100 SOL (in lamports). Got ${creationFee.toString()}`,
        field: "fee.poolCreationFee",
        suggestedFix: "Set poolCreationFee to 0 or within [1,000,000, 100,000,000,000] lamports.",
      });
    }
  }

  return {
    valid: errors.length === 0,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export const validateDBCConfig = validateConfig;

