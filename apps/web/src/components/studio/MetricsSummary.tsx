"use client";

import React from "react";
import { DBCConfig, SimulationMetrics } from "@curve-studio/core";
import Decimal from "decimal.js";
import { Shield, Sparkles, TrendingUp, Lock, Percent, DollarSign } from "lucide-react";

interface MetricsSummaryProps {
  config: DBCConfig;
  metrics?: SimulationMetrics;
  quoteSymbol?: string;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  config,
  metrics,
  quoteSymbol = "SOL",
}) => {
  const quoteDecimals = config.token.quoteDecimals;
  const baseDecimals = config.token.baseDecimals;

  const thresholdFormatted = new Decimal(config.migrationQuoteThreshold.toString())
    .div(10 ** quoteDecimals)
    .toFixed(2);

  const totalSupplyFormatted = new Decimal(config.token.totalTokenSupply)
    .div(10 ** baseDecimals)
    .toNumber()
    .toLocaleString();

  const graduationFDV = (
    config.migrationPrice *
    new Decimal(config.token.totalTokenSupply).div(10 ** baseDecimals).toNumber()
  ).toLocaleString(undefined, { maximumFractionDigits: 0 });

  const sniperScore = metrics?.sniperResistanceScore ?? 85;
  const fairnessScore = metrics?.fairnessScore ?? 0.88;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Graduation Threshold */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <TrendingUp className="h-3.5 w-3.5 text-brand-meteora" />
          Graduation Target
        </div>
        <div className="text-lg font-bold font-mono text-white">
          {thresholdFormatted} <span className="text-xs font-normal text-slate-400">{quoteSymbol}</span>
        </div>
        <div className="text-[10px] text-slate-400">Triggers DAMM v2 Migration</div>
      </div>

      {/* 2. Graduation FDV */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          Graduation FDV
        </div>
        <div className="text-lg font-bold font-mono text-emerald-400">
          {graduationFDV} <span className="text-xs font-normal text-slate-400">{quoteSymbol}</span>
        </div>
        <div className="text-[10px] text-slate-400">Total Supply: {totalSupplyFormatted}</div>
      </div>

      {/* 3. Sniper Resistance */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Shield className="h-3.5 w-3.5 text-purple-400" />
          Sniper Resistance
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono text-purple-400">
            {sniperScore}
            <span className="text-xs text-slate-400">/100</span>
          </span>
          <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              style={{ width: `${sniperScore}%` }}
            />
          </div>
        </div>
        <div className="text-[10px] text-slate-400">Anti-MEV Decay Protection</div>
      </div>

      {/* 4. Fairness Score */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          Fairness Score
        </div>
        <div className="text-lg font-bold font-mono text-amber-400">
          {(fairnessScore * 100).toFixed(0)}%
        </div>
        <div className="text-[10px] text-slate-400">Gini Float Distribution</div>
      </div>

      {/* 5. Creator Fee Take */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Percent className="h-3.5 w-3.5 text-cyan-400" />
          Creator Fee Share
        </div>
        <div className="text-lg font-bold font-mono text-cyan-400">
          {config.fee.creatorTradingFeePercentage}%
        </div>
        <div className="text-[10px] text-slate-400">Streams Real-Time to Creator</div>
      </div>

      {/* 6. Locked Liquidity */}
      <div className="rounded-xl glass-panel p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          LP Lock Security
        </div>
        <div className="text-lg font-bold font-mono text-white">
          {config.liquidityDistribution.partnerPermanentLockedLiquidityPercentage}%
        </div>
        <div className="text-[10px] text-emerald-400 font-medium">Permanent On-Chain Lock</div>
      </div>
    </div>
  );
};
