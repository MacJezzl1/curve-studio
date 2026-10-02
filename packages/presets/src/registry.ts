import {
  buildBondingCurve,
  validateDBCConfig,
  DBCConfig,
  BondingCurveBuildParams,
} from "@curve-studio/core";
import BN from "bn.js";
import { CurvePreset, PresetCategory } from "./schema.js";
import { stockPriceDiscoveryPreset } from "./presets/stock-price-discovery.js";
import { fairMemePreset } from "./presets/fair-meme.js";
import { rwaLongTailPreset } from "./presets/rwa-long-tail.js";
import { aiAgentTokenPreset } from "./presets/ai-agent-token.js";
import { convictionPoolPreset } from "./presets/conviction-pool.js";

export const ALL_PRESETS: CurvePreset[] = [
  stockPriceDiscoveryPreset,
  fairMemePreset,
  rwaLongTailPreset,
  aiAgentTokenPreset,
  convictionPoolPreset,
];

export function getAllPresets(): CurvePreset[] {
  return ALL_PRESETS;
}

export function getPresetById(id: string): CurvePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

export function getPresetsByCategory(category: PresetCategory): CurvePreset[] {
  return ALL_PRESETS.filter((p) => p.category === category);
}

export type PresetInstantiationOverrides = Partial<{
  tokenSupply: string;
  startPrice: number;
  migrationPrice: number;
  startingFeeBps: number;
  endingFeeBps: number;
  creatorTradingFeePercentage: number;
}>;

/**
 * Instantiates a validated DBCConfig from a Preset ID, applying any user overrides.
 * Verifies that the instantiated configuration strictly satisfies all on-chain Meteora DBC invariants.
 */
export function instantiatePreset(
  presetId: string,
  overrides?: PresetInstantiationOverrides
): DBCConfig {
  const preset = getPresetById(presetId);
  if (!preset) {
    throw new Error(`Preset with ID '${presetId}' not found.`);
  }

  const bp = preset.builderParams;

  const buildParams: BondingCurveBuildParams = {
    token: {
      tokenType: bp.token.tokenType,
      baseDecimals: bp.token.baseDecimals,
      quoteDecimals: bp.token.quoteDecimals,
      tokenAuthorityOption: bp.token.tokenAuthorityOption,
      totalTokenSupply: new BN(overrides?.tokenSupply ?? bp.token.totalTokenSupply),
      leftover: new BN(bp.token.leftover),
    },
    curve: {
      startPrice: overrides?.startPrice ?? bp.curve.startPrice,
      migrationPrice: overrides?.migrationPrice ?? bp.curve.migrationPrice,
      migrationTargetPercentage: bp.curve.migrationTargetPercentage,
      numSegments: bp.curve.numSegments,
      steepnessExponent: bp.curve.steepnessExponent,
    },
    fee: {
      baseFeeMode: bp.fee.baseFeeMode,
      startingFeeBps: overrides?.startingFeeBps ?? bp.fee.startingFeeBps,
      endingFeeBps: overrides?.endingFeeBps ?? bp.fee.endingFeeBps,
      numberOfPeriod: bp.fee.numberOfPeriod,
      totalDuration: bp.fee.totalDuration,
      dynamicFeeEnabled: bp.fee.dynamicFeeEnabled,
      collectFeeMode: bp.fee.collectFeeMode,
      creatorTradingFeePercentage:
        overrides?.creatorTradingFeePercentage ?? bp.fee.creatorTradingFeePercentage,
      poolCreationFee: new BN(bp.fee.poolCreationFee),
      enableFirstSwapWithMinFee: bp.fee.enableFirstSwapWithMinFee,
    },
    migration: {
      migrationOption: bp.migration.migrationOption,
      migrationFeeOption: bp.migration.migrationFeeOption,
      feePercentage: bp.migration.feePercentage,
      creatorFeePercentage: bp.migration.creatorFeePercentage,
      migratedPoolFee: bp.migration.migratedPoolFee,
    },
    liquidityDistribution: bp.liquidityDistribution,
    activationType: bp.activationType,
  };

  const config = buildBondingCurve(buildParams);
  const validation = validateDBCConfig(config);

  if (!validation.isValid) {
    const errorDetails = validation.errors.map((e) => `[${e.code}] ${e.field}: ${e.message}`).join("\n");
    throw new Error(
      `Preset '${presetId}' instantiation failed DBC invariant validation:\n${errorDetails}`
    );
  }

  return config;
}
