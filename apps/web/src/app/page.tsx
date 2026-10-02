"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  instantiatePreset,
  ALL_PRESETS,
  getPresetById,
} from "@curve-studio/presets";
import {
  validateDBCConfig,
  buildBondingCurve,
  BondingCurveBuildParams,
  ValidationResult,
  DBCConfig,
} from "@curve-studio/core";
import BN from "bn.js";
import { CurveChart } from "@/components/studio/CurveChart";
import { ParameterForm, StudioParameters } from "@/components/studio/ParameterForm";
import { ValidatorBanner } from "@/components/studio/ValidatorBanner";
import { MetricsSummary } from "@/components/studio/MetricsSummary";
import { ScenarioRunner } from "@/components/studio/ScenarioRunner";
import { Rocket, Sparkles, Layers, ShieldCheck } from "lucide-react";

export default function StudioPage() {
  const defaultPreset = ALL_PRESETS[0]!;
  const defaultBp = defaultPreset.builderParams;

  const [params, setParams] = useState<StudioParameters>({
    presetId: defaultPreset.id,
    startPrice: defaultBp.curve.startPrice,
    migrationPrice: defaultBp.curve.migrationPrice,
    numSegments: defaultBp.curve.numSegments,
    totalTokenSupply: defaultBp.token.totalTokenSupply,
    migrationTargetPercentage: defaultBp.curve.migrationTargetPercentage,
    startingFeeBps: defaultBp.fee.startingFeeBps,
    endingFeeBps: defaultBp.fee.endingFeeBps,
    decayDurationSeconds: defaultBp.fee.totalDuration,
    creatorTradingFeePercentage: defaultBp.fee.creatorTradingFeePercentage,
    quoteSymbol: defaultPreset.recommendedQuoteToken,
  });

  const [highlightPrice, setHighlightPrice] = useState<number | undefined>(undefined);

  // Compute live DBCConfig from current parameters
  const { config, validation } = useMemo<{
    config: DBCConfig;
    validation: ValidationResult;
  }>(() => {
    try {
      const preset = getPresetById(params.presetId) ?? defaultPreset;
      const bp = preset.builderParams;

      const buildParams: BondingCurveBuildParams = {
        token: {
          tokenType: bp.token.tokenType,
          baseDecimals: bp.token.baseDecimals,
          quoteDecimals: params.quoteSymbol === "SOL" ? 9 : 6,
          tokenAuthorityOption: bp.token.tokenAuthorityOption,
          totalTokenSupply: new BN(params.totalTokenSupply),
          leftover: new BN(bp.token.leftover),
        },
        curve: {
          startPrice: params.startPrice,
          migrationPrice: params.migrationPrice,
          migrationTargetPercentage: params.migrationTargetPercentage,
          numSegments: params.numSegments,
          steepnessExponent: bp.curve.steepnessExponent,
        },
        fee: {
          baseFeeMode: bp.fee.baseFeeMode,
          startingFeeBps: params.startingFeeBps,
          endingFeeBps: params.endingFeeBps,
          numberOfPeriod: bp.fee.numberOfPeriod,
          totalDuration: params.decayDurationSeconds,
          dynamicFeeEnabled: bp.fee.dynamicFeeEnabled,
          collectFeeMode: bp.fee.collectFeeMode,
          creatorTradingFeePercentage: params.creatorTradingFeePercentage,
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

      const builtConfig = buildBondingCurve(buildParams);
      const val = validateDBCConfig(builtConfig);
      return { config: builtConfig, validation: val };
    } catch {
      const fallback = instantiatePreset(defaultPreset.id);
      return { config: fallback, validation: validateDBCConfig(fallback) };
    }
  }, [params, defaultPreset]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-meteora/30 bg-brand-meteora/10 px-3 py-1 text-xs font-semibold text-brand-meteora mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Meteora Dynamic Bonding Curve Studio</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Design, Simulate & Launch Curves
          </h1>
          <p className="mt-1 text-sm text-slate-400 max-w-2xl">
            Pure mathematical precision for Meteora DBC. Test custom multi-segment geometries, fee decay schedulers, and zero-rug DAMM v2 migrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/presets"
            className="flex items-center gap-2 rounded-lg bg-surface border border-surface-border px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-surface-card hover:text-white transition-all"
          >
            <Layers className="h-4 w-4 text-brand-meteora" />
            Explore Presets
          </Link>

          <Link
            href={`/deploy?preset=${params.presetId}`}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-brand-meteora px-5 py-2.5 text-xs font-semibold text-slate-950 hover:brightness-110 shadow-lg shadow-brand-meteora/20 transition-all font-mono"
          >
            <Rocket className="h-4 w-4" />
            Deploy on Devnet
          </Link>
        </div>
      </div>

      {/* Validator Banner */}
      <ValidatorBanner validation={validation} />

      {/* Metrics Summary Strip */}
      <MetricsSummary config={config} quoteSymbol={params.quoteSymbol} />

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Form */}
        <div className="lg:col-span-5 space-y-6">
          <ParameterForm params={params} onChange={setParams} />
        </div>

        {/* Right Column: Interactive Curve Chart + Scenario Runner */}
        <div className="lg:col-span-7 space-y-6">
          <CurveChart
            config={config}
            currentStepPrice={highlightPrice}
            quoteSymbol={params.quoteSymbol}
          />

          <ScenarioRunner
            config={config}
            quoteSymbol={params.quoteSymbol}
            onStepSelect={(price) => setHighlightPrice(price)}
          />
        </div>
      </div>
    </div>
  );
}
