"use client";

import React, { useState } from "react";
import { ValidationResult } from "@curve-studio/core";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

interface ValidatorBannerProps {
  validation: ValidationResult;
}

export const ValidatorBanner: React.FC<ValidatorBannerProps> = ({ validation }) => {
  const [expanded, setExpanded] = useState(false);
  const isValid = validation.valid || validation.isValid;

  if (isValid && validation.warnings.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold tracking-wide">
            METEORA DBC INVARIANTS SATISFIED
          </span>
          <span className="text-slate-400">
            • 0 errors • Safe for on-chain deployment
          </span>
        </div>
        <div className="text-[11px] font-mono bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
          PROGRAM ID: dbcij3LW...aqN
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border text-xs transition-all ${
        !isValid
          ? "border-red-500/40 bg-red-500/10 text-red-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-300"
      }`}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {!isValid ? (
            <XCircle className="h-4 w-4 text-red-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          )}
          <span className="font-semibold tracking-wide">
            {!isValid
              ? `METEORA INVARIANT VIOLATION (${validation.errors.length} ERRORS)`
              : `CONFIG WARNINGS (${validation.warnings.length} WARNINGS)`}
          </span>
          <span className="text-slate-400">
            {!isValid
              ? "Cannot deploy to Solana until resolved"
              : "Review recommended improvements"}
          </span>
        </div>

        <button className="flex items-center gap-1 font-medium hover:underline">
          {expanded ? "Hide Details" : "Show Fixes"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-surface-border px-4 py-3 space-y-2 bg-surface/50">
          {validation.errors.map((err, idx) => (
            <div key={idx} className="rounded bg-red-950/40 border border-red-800/40 p-2.5">
              <div className="flex items-center justify-between font-mono font-semibold text-red-400">
                <span>[{err.code}] {err.field}</span>
                <span className="text-[10px] uppercase tracking-wider text-red-500 font-sans">Required Fix</span>
              </div>
              <p className="mt-1 text-slate-300">{err.message}</p>
              <p className="mt-1 text-emerald-400 text-[11px] font-medium">
                Tip: {err.suggestedFix}
              </p>
            </div>
          ))}

          {validation.warnings.map((warn, idx) => (
            <div key={idx} className="rounded bg-amber-950/40 border border-amber-800/40 p-2.5">
              <div className="font-mono font-semibold text-amber-400">
                [{warn.code}] {warn.field}
              </div>
              <p className="mt-1 text-slate-300">{warn.message}</p>
              <p className="mt-1 text-amber-300 text-[11px]">
                Recommendation: {warn.suggestedFix}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
