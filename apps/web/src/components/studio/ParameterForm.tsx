"use client";

import React from "react";
import { ALL_PRESETS, getPresetById } from "@curve-studio/presets";
import { Sliders, Zap } from "lucide-react";

export interface StudioParameters {
  presetId: string;
  startPrice: number;
  migrationPrice: number;
  numSegments: number;
  totalTokenSupply: string;
  migrationTargetPercentage: number;
  startingFeeBps: number;
  endingFeeBps: number;
  decayDurationSeconds: number;
  creatorTradingFeePercentage: number;
  quoteSymbol: "SOL" | "USDC";
}

interface ParameterFormProps {
  params: StudioParameters;
  onChange: (updated: StudioParameters) => void;
}

export const ParameterForm: React.FC<ParameterFormProps> = ({ params, onChange }) => {
  const handlePresetSelect = (id: string) => {
    const preset = getPresetById(id);
    if (!preset) return;
    const bp = preset.builderParams;

    onChange({
      ...params,
      presetId: id,
      startPrice: bp.curve.startPrice,
      migrationPrice: bp.curve.migrationPrice,
      numSegments: bp.curve.numSegments,
      totalTokenSupply: bp.token.totalTokenSupply,
      migrationTargetPercentage: bp.curve.migrationTargetPercentage,
      startingFeeBps: bp.fee.startingFeeBps,
      endingFeeBps: bp.fee.endingFeeBps,
      decayDurationSeconds: bp.fee.totalDuration,
      creatorTradingFeePercentage: bp.fee.creatorTradingFeePercentage,
      quoteSymbol: preset.recommendedQuoteToken,
    });
  };

  return (
    <div className="rounded-xl glass-panel p-5 space-y-5">
      {/* Preset Quick Loader */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-brand-meteora" />
            Quick Presets
          </label>
          <span className="text-[11px] text-slate-400">Battle-tested templates</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_PRESETS.map((p) => {
            const isSelected = params.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetSelect(p.id)}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                  isSelected
                    ? "bg-brand-meteora/15 border-brand-meteora text-brand-meteora shadow-sm shadow-brand-meteora/10"
                    : "bg-surface-card border-surface-border text-slate-300 hover:border-slate-600 hover:text-white"
                }`}
              >
                <div className="font-semibold truncate">{p.name.split("/")[0]}</div>
                <div className="text-[10px] text-slate-400 capitalize">{p.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-surface-border" />

      {/* Pricing & Float */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Sliders className="h-3.5 w-3.5 text-emerald-400" />
          Curve Geometry
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Start Price ({params.quoteSymbol})
            </label>
            <input
              type="number"
              step="any"
              value={params.startPrice}
              onChange={(e) =>
                onChange({ ...params, startPrice: parseFloat(e.target.value) || 0.000001 })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Migration Price ({params.quoteSymbol})
            </label>
            <input
              type="number"
              step="any"
              value={params.migrationPrice}
              onChange={(e) =>
                onChange({ ...params, migrationPrice: parseFloat(e.target.value) || 0.00001 })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Segments Count ({params.numSegments})
            </label>
            <select
              value={params.numSegments}
              onChange={(e) =>
                onChange({ ...params, numSegments: parseInt(e.target.value, 10) })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-meteora"
            >
              <option value={1}>1 Segment (Classic AMM)</option>
              <option value={2}>2 Segments (Standard)</option>
              <option value={4}>4 Segments (Smooth)</option>
              <option value={8}>8 Segments (Ultra Fine)</option>
              <option value={16}>16 Segments (Max Meteora)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Curve Supply Float (%)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={params.migrationTargetPercentage}
              onChange={(e) =>
                onChange({
                  ...params,
                  migrationTargetPercentage: parseInt(e.target.value, 10) || 20,
                })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Quote Asset</label>
            <select
              value={params.quoteSymbol}
              onChange={(e) =>
                onChange({ ...params, quoteSymbol: e.target.value as "SOL" | "USDC" })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-meteora"
            >
              <option value="SOL">SOL (Native)</option>
              <option value="USDC">USDC (Stable)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-surface-border" />

      {/* Fee Scheduler */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Fee Dynamics (Anti-Snipe Scheduler)
          </span>
          <span className="text-[11px] text-brand-meteora font-mono">
            {params.startingFeeBps} bps → {params.endingFeeBps} bps
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Starting Fee (bps)
            </label>
            <input
              type="number"
              min={25}
              max={9900}
              value={params.startingFeeBps}
              onChange={(e) =>
                onChange({
                  ...params,
                  startingFeeBps: parseInt(e.target.value, 10) || 100,
                })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Ending Fee (bps)
            </label>
            <input
              type="number"
              min={25}
              max={9900}
              value={params.endingFeeBps}
              onChange={(e) =>
                onChange({
                  ...params,
                  endingFeeBps: parseInt(e.target.value, 10) || 25,
                })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Creator Fee Share (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={params.creatorTradingFeePercentage}
              onChange={(e) =>
                onChange({
                  ...params,
                  creatorTradingFeePercentage: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-meteora"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
