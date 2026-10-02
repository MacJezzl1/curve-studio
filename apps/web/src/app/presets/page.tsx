"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ALL_PRESETS, PresetCategory } from "@curve-studio/presets";
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Building,
  CheckCircle,
} from "lucide-react";

export default function PresetsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Presets" },
    { id: "equity", label: "Equities & Stocks" },
    { id: "meme", label: "Fair Meme" },
    { id: "rwa", label: "RWA & Credit" },
    { id: "agent", label: "AI Agents" },
    { id: "conviction", label: "Conviction Pools" },
  ];

  const filteredPresets = ALL_PRESETS.filter(
    (p) => selectedCategory === "all" || p.category === selectedCategory
  );

  const getCategoryIcon = (cat: PresetCategory) => {
    switch (cat) {
      case "equity":
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case "meme":
        return <Zap className="h-4 w-4 text-amber-400" />;
      case "rwa":
        return <Building className="h-4 w-4 text-blue-400" />;
      case "agent":
        return <Cpu className="h-4 w-4 text-purple-400" />;
      case "conviction":
        return <ShieldCheck className="h-4 w-4 text-brand-meteora" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-meteora/30 bg-brand-meteora/10 px-3 py-1 text-xs font-semibold text-brand-meteora mb-2">
          <Layers className="h-3.5 w-3.5" />
          <span>Preset Marketplace</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Battle-Tested Bonding Curve Presets
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-2xl">
          Engineered mechanisms moving beyond speculative memes into synthetic equities, real-world assets, autonomous AI agent treasuries, and conviction staking.
        </p>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                  isSelected
                    ? "bg-brand-meteora/20 border-brand-meteora text-brand-meteora shadow-sm shadow-brand-meteora/10"
                    : "bg-surface border-surface-border text-slate-300 hover:text-white hover:border-slate-600"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            className="rounded-2xl glass-panel p-6 flex flex-col justify-between space-y-6 hover:border-brand-meteora/40 transition-all group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-full bg-surface-card border border-surface-border px-2.5 py-1 text-xs font-semibold text-slate-200 capitalize">
                  {getCategoryIcon(preset.category)}
                  {preset.category}
                </span>

                <span className="text-[11px] font-mono rounded bg-slate-800 px-2 py-0.5 text-slate-300 border border-slate-700">
                  Quote: {preset.recommendedQuoteToken}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-brand-meteora transition-colors">
                  {preset.name}
                </h3>
                <p className="mt-1 text-xs text-brand-meteora/90 font-medium">
                  {preset.tagline}
                </p>
                <p className="mt-2 text-xs text-slate-400 line-clamp-3">
                  {preset.description}
                </p>
              </div>

              {/* Key Mechanics */}
              <div className="rounded-xl bg-surface/60 border border-surface-border/60 p-3 space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Key Mechanics
                </div>
                <ul className="space-y-1 text-xs text-slate-300">
                  {preset.keyMechanics.slice(0, 3).map((mech, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-brand-meteora shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{mech}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Migration Plan Preview */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-surface-border pt-3">
                <span>Migration Destination:</span>
                <span className="font-semibold text-white bg-surface-card px-2 py-0.5 rounded border border-surface-border">
                  {preset.migrationPlan.target.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/?preset=${preset.id}`}
                className="flex-1 text-center rounded-lg bg-surface border border-surface-border py-2 text-xs font-semibold text-slate-200 hover:bg-surface-card hover:text-white transition-all"
              >
                Inspect in Studio
              </Link>
              <Link
                href={`/deploy?preset=${preset.id}`}
                className="flex items-center justify-center gap-1 rounded-lg bg-brand-meteora px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-300 transition-all font-mono shadow-sm shadow-brand-meteora/20"
              >
                Deploy <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
