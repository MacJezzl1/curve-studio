"use client";

import React, { useState } from "react";
import { DBCConfig, simulateTrades, TradeInput, SimulationResult } from "@curve-studio/core";
import BN from "bn.js";
import Decimal from "decimal.js";
import { Play, Plus, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

interface ScenarioRunnerProps {
  config: DBCConfig;
  quoteSymbol?: string;
  onStepSelect?: (spotPrice: number) => void;
}

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
  config,
  quoteSymbol = "SOL",
  onStepSelect,
}) => {
  const [trades, setTrades] = useState<Array<{ direction: "buy" | "sell"; amount: string }>>([
    { direction: "buy", amount: "5" },
    { direction: "buy", amount: "15" },
    { direction: "sell", amount: "2000000" },
    { direction: "buy", amount: "30" },
  ]);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const runSimulation = () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      const quoteDecimals = config.token.quoteDecimals;
      const baseDecimals = config.token.baseDecimals;

      const formattedTrades: TradeInput[] = trades
        .filter((t) => parseFloat(t.amount || "0") > 0)
        .map((t) => {
          const decimals = t.direction === "buy" ? quoteDecimals : baseDecimals;
          const rawAmount = new Decimal(t.amount || "0").mul(10 ** decimals).toFixed(0);
          return {
            direction: t.direction,
            amount: new BN(rawAmount),
          };
        });

      if (formattedTrades.length === 0) {
        setSimError("Please add at least one trade with an amount greater than 0.");
        setIsSimulating(false);
        return;
      }

      const result = simulateTrades(config, formattedTrades);
      setSimResult(result);
    } catch (err: any) {
      console.error("Simulation run error:", err);
      setSimError(err?.message || "Failed to execute trade simulation.");
    } finally {
      setIsSimulating(false);
    }
  };

  const loadScenario = (type: "sniper" | "organic" | "whale") => {
    if (type === "sniper") {
      setTrades([
        { direction: "buy", amount: "25" },
        { direction: "buy", amount: "5" },
        { direction: "sell", amount: "10000000" },
      ]);
    } else if (type === "organic") {
      setTrades([
        { direction: "buy", amount: "2" },
        { direction: "buy", amount: "4" },
        { direction: "buy", amount: "8" },
        { direction: "sell", amount: "1500000" },
        { direction: "buy", amount: "12" },
      ]);
    } else {
      setTrades([
        { direction: "buy", amount: "50" },
        { direction: "sell", amount: "25000000" },
        { direction: "buy", amount: "30" },
      ]);
    }
  };

  return (
    <div className="rounded-xl glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">
            TRADE SIMULATION & MEV STRESS TEST
          </h3>
          <p className="text-xs text-slate-400">
            Simulate sequential order fills, price impact, and fee decay dynamics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadScenario("sniper")}
            className="px-2 py-1 rounded bg-surface border border-surface-border text-[11px] text-slate-300 hover:text-white hover:border-slate-500"
          >
            Sniper Attack
          </button>
          <button
            type="button"
            onClick={() => loadScenario("organic")}
            className="px-2 py-1 rounded bg-surface border border-surface-border text-[11px] text-slate-300 hover:text-white hover:border-slate-500"
          >
            Organic Waves
          </button>
          <button
            type="button"
            disabled={isSimulating}
            onClick={runSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-meteora text-slate-950 font-semibold text-xs hover:bg-cyan-300 transition-all shadow-md shadow-brand-meteora/20 disabled:opacity-50"
          >
            {isSimulating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {isSimulating ? "Simulating..." : "Run Scenario"}
          </button>
        </div>
      </div>

      {simError && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-3 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{simError}</span>
        </div>
      )}

      {/* Trade Inputs Row */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Queued Trades ({trades.length})</span>
          <button
            type="button"
            onClick={() => setTrades([...trades, { direction: "buy", amount: "10" }])}
            className="flex items-center gap-1 text-brand-meteora hover:underline text-xs"
          >
            <Plus className="h-3 w-3" /> Add Trade
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {trades.map((t, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 bg-surface rounded-lg p-2 border border-surface-border text-xs"
            >
              <span className="font-mono text-slate-400 text-[10px]">#{idx + 1}</span>
              <button
                type="button"
                onClick={() => {
                  const updated = [...trades];
                  updated[idx]!.direction = t.direction === "buy" ? "sell" : "buy";
                  setTrades(updated);
                }}
                className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                  t.direction === "buy"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {t.direction}
              </button>
              <input
                type="number"
                step="any"
                value={t.amount}
                onChange={(e) => {
                  const updated = [...trades];
                  updated[idx]!.amount = e.target.value;
                  setTrades(updated);
                }}
                className="w-full bg-transparent font-mono text-white text-xs focus:outline-none"
                placeholder={t.direction === "buy" ? `Amt (${quoteSymbol})` : "Base Units"}
              />
              <button
                type="button"
                onClick={() => setTrades(trades.filter((_, i) => i !== idx))}
                className="text-slate-400 hover:text-red-400 p-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Results Table */}
      {simResult && (
        <div className="border-t border-surface-border pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Execution Results</span>
            <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>Vol: {new Decimal(simResult.totalVolumeQuote.toString()).div(10 ** config.token.quoteDecimals).toFixed(2)} {quoteSymbol}</span>
              <span>•</span>
              <span>Peak Price: {simResult.peakPrice.toPrecision(4)}</span>
              <span>•</span>
              <span className={simResult.isGraduated ? "text-emerald-400 font-bold" : "text-slate-400"}>
                {simResult.isGraduated ? "Graduated to DAMM v2!" : "Active on DBC"}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-border bg-surface/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-surface-border text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">In</th>
                  <th className="py-2 px-3">Out</th>
                  <th className="py-2 px-3">Spot After</th>
                  <th className="py-2 px-3">Impact</th>
                  <th className="py-2 px-3">Fee Total</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-mono">
                {simResult.steps.map((step, idx) => {
                  const isBuy = step.direction === "buy";
                  const inDecimals = isBuy ? config.token.quoteDecimals : config.token.baseDecimals;
                  const outDecimals = isBuy ? config.token.baseDecimals : config.token.quoteDecimals;
                  const inFormatted = new Decimal(step.amountIn.toString()).div(10 ** inDecimals).toFixed(2);
                  const outFormatted = new Decimal(step.amountOut.toString()).div(10 ** outDecimals).toFixed(2);
                  const feeFormatted = new Decimal(step.feeTotal.toString()).div(10 ** config.token.quoteDecimals).toFixed(4);

                  return (
                    <tr
                      key={idx}
                      onClick={() => onStepSelect?.(step.spotPriceAfter)}
                      className="hover:bg-surface-card/60 transition-colors cursor-pointer"
                    >
                      <td className="py-2 px-3 text-slate-400">{step.step}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isBuy ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {step.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-200">{inFormatted}</td>
                      <td className="py-2 px-3 text-slate-200">{outFormatted}</td>
                      <td className="py-2 px-3 text-cyan-400 font-semibold">{step.spotPriceAfter.toPrecision(4)}</td>
                      <td className="py-2 px-3 text-slate-300">{(step.priceImpactBps / 100).toFixed(2)}%</td>
                      <td className="py-2 px-3 text-slate-400">{feeFormatted}</td>
                      <td className="py-2 px-3">
                        {step.graduated ? (
                          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-sans font-bold">
                            MIGRATED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-sans">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
