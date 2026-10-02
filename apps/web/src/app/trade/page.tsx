"use client";

import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import { DbcAdapter } from "@curve-studio/chain";
import { ALL_PRESETS, instantiatePreset } from "@curve-studio/presets";
import {
  TrendingUp,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";

export default function TradePage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [poolAddressInput, setPoolAddressInput] = useState("");
  const [tradeDirection, setTradeDirection] = useState<"buy" | "sell">("buy");
  const [tradeAmount, setTradeAmount] = useState<string>("1");
  const [slippageBps, setSlippageBps] = useState<number>(100); // 1%
  const [isSwapping, setIsSwapping] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [migrateSig, setMigrateSig] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mock demonstration pool state
  const mockPreset = ALL_PRESETS[1]!; // Fair meme
  const mockConfig = instantiatePreset(mockPreset.id);

  const [currentProgress, setCurrentProgress] = useState(65); // 65% bonded

  const quoteSymbol = "SOL";
  const quoteDecimals = 9;
  const baseDecimals = 6;

  // Approximate quote output calculation for UI
  const calculatedOutput = React.useMemo(() => {
    try {
      const amt = parseFloat(tradeAmount) || 0;
      if (tradeDirection === "buy") {
        // SOL to tokens
        const avgPrice = mockConfig.initialPrice * 2.5;
        const tokens = amt / avgPrice;
        return tokens.toLocaleString(undefined, { maximumFractionDigits: 2 });
      } else {
        // Tokens to SOL
        const avgPrice = mockConfig.initialPrice * 2.5;
        const sol = amt * avgPrice;
        return sol.toFixed(4);
      }
    } catch {
      return "0";
    }
  }, [tradeAmount, tradeDirection, mockConfig]);

  const handleSwap = async () => {
    if (!publicKey || !connected) {
      setErrorMessage("Please connect wallet to execute swaps.");
      return;
    }

    if (!poolAddressInput.trim()) {
      setErrorMessage("Enter an on-chain DBC pool address (or deploy one from the Deployer tab).");
      return;
    }

    setIsSwapping(true);
    setErrorMessage(null);
    setTxSig(null);

    try {
      const poolPubkey = new PublicKey(poolAddressInput.trim());
      const adapter = new DbcAdapter(connection);

      const decimals = tradeDirection === "buy" ? quoteDecimals : baseDecimals;
      const amountIn = new BN(new Decimal(tradeAmount).mul(10 ** decimals).toFixed(0));

      const res = await adapter.buildSwapTx({
        owner: publicKey,
        poolAddress: poolPubkey,
        swapBaseForQuote: tradeDirection === "sell",
        amountIn,
        slippageBps,
      });

      const sig = await sendTransaction(res.transaction, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
    } catch (err: any) {
      console.error("Swap error:", err);
      setErrorMessage(err?.message || "Failed to execute swap transaction.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleMigrate = async () => {
    if (!publicKey || !connected) {
      setErrorMessage("Please connect wallet to trigger graduation migration.");
      return;
    }

    if (!poolAddressInput.trim()) {
      setErrorMessage("Enter an on-chain DBC pool address to migrate.");
      return;
    }

    setIsMigrating(true);
    setErrorMessage(null);
    setMigrateSig(null);

    try {
      const poolPubkey = new PublicKey(poolAddressInput.trim());
      const adapter = new DbcAdapter(connection);

      // Default Meteora DAMM v2 config on Devnet/Mainnet
      const dammConfig = new PublicKey("2v2C2M5eE2b6GkX29uB9X4L7F4e6XoN6Z3H7rDk1L2b7");

      const res = await adapter.buildMigrateToDammV2Tx({
        payer: publicKey,
        poolAddress: poolPubkey,
        dammConfig,
      });

      const sig = await sendTransaction(res.transaction, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setMigrateSig(sig);
    } catch (err: any) {
      console.error("Migration error:", err);
      setErrorMessage(err?.message || "Failed to migrate pool to DAMM v2.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-meteora/30 bg-brand-meteora/10 px-3 py-1 text-xs font-semibold text-brand-meteora mb-2">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Launch & Trading Terminal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">
          Bonding Curve & DAMM v2 Migration
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Execute exact-in swaps against active DBC virtual pools with live slippage calculation and graduation triggers.
        </p>
      </div>

      {/* Bonding Progress Card */}
      <div className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              Bonding Curve Migration Progress
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Target: 30.00 SOL accumulated in quote reserves before auto-graduation
            </div>
          </div>
          <span className="text-2xl font-bold font-mono text-brand-meteora">
            {currentProgress}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full rounded-full bg-surface-border overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-brand-meteora to-emerald-400 transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Quote Raised: 19.5 SOL</span>
          <span>Threshold: 30.0 SOL</span>
        </div>

        {/* Graduation Action Banner */}
        {currentProgress >= 100 ? (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-emerald-400 font-bold text-sm block">
                BONDING CURVE COMPLETE!
              </span>
              <span className="text-xs text-slate-300">
                Threshold reached. Ready to seed permanent DAMM v2 liquidity pool.
              </span>
            </div>
            <button
              type="button"
              disabled={isMigrating}
              onClick={handleMigrate}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-1.5 shrink-0"
            >
              {isMigrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Trigger DAMM v2 Migration
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Destination: Meteora DAMM v2 (Permanent LP Lock)</span>
            <button
              type="button"
              onClick={() => setCurrentProgress(100)}
              className="text-[11px] text-brand-meteora hover:underline"
            >
              [Simulate 100% Graduation]
            </button>
          </div>
        )}
      </div>

      {/* Swap Widget */}
      <div className="rounded-2xl glass-panel p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-brand-meteora" />
            Bonding Curve Swap
          </h3>
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-surface-border text-xs">
            <button
              type="button"
              onClick={() => setTradeDirection("buy")}
              className={`px-3 py-1 rounded font-bold transition-all ${
                tradeDirection === "buy"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setTradeDirection("sell")}
              className={`px-3 py-1 rounded font-bold transition-all ${
                tradeDirection === "sell"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Pool Address Input */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            DBC Virtual Pool Address (Public Key)
          </label>
          <input
            type="text"
            value={poolAddressInput}
            onChange={(e) => setPoolAddressInput(e.target.value)}
            placeholder="Paste deployed DBC pool address (e.g. 7xKX...)"
            className="w-full rounded-lg bg-surface border border-surface-border px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-meteora"
          />
        </div>

        {/* Amount Input */}
        <div className="rounded-xl bg-surface p-4 border border-surface-border space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>You Pay</span>
            <span>Balance: --</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              step="any"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="w-full bg-transparent text-2xl font-mono font-bold text-white focus:outline-none"
              placeholder="0.0"
            />
            <span className="rounded-lg bg-surface-card px-3 py-1 text-sm font-bold text-white border border-surface-border shrink-0">
              {tradeDirection === "buy" ? quoteSymbol : "TOKEN"}
            </span>
          </div>
        </div>

        {/* Output Estimation */}
        <div className="rounded-xl bg-surface/50 p-4 border border-surface-border space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estimated Output</span>
            <span>Est. Slippage: {(slippageBps / 100).toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-mono font-bold text-brand-meteora">
              {calculatedOutput}
            </div>
            <span className="rounded-lg bg-surface-card px-3 py-1 text-sm font-bold text-slate-300 border border-surface-border shrink-0">
              {tradeDirection === "buy" ? "TOKEN" : quoteSymbol}
            </span>
          </div>
        </div>

        {/* Slippage Settings */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Max Slippage Tolerance</span>
          <div className="flex items-center gap-1.5">
            {[50, 100, 250].map((bps) => (
              <button
                key={bps}
                type="button"
                onClick={() => setSlippageBps(bps)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                  slippageBps === bps
                    ? "bg-brand-meteora/20 border-brand-meteora text-brand-meteora"
                    : "bg-surface border-surface-border text-slate-400 hover:text-white"
                }`}
              >
                {(bps / 100).toFixed(1)}%
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success */}
        {txSig && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Swap confirmed on-chain!</span>
            </div>
            <a
              href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 hover:underline"
            >
              View Tx <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={!connected || isSwapping}
          onClick={handleSwap}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            !connected
              ? "bg-surface-card text-slate-400 border border-surface-border cursor-not-allowed"
              : isSwapping
              ? "bg-brand-meteora/50 text-slate-950 cursor-wait"
              : "bg-brand-meteora text-slate-950 hover:bg-cyan-300 shadow-brand-meteora/20"
          }`}
        >
          {isSwapping ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Swap...
            </>
          ) : !connected ? (
            "Connect Wallet to Trade"
          ) : (
            `Execute ${tradeDirection.toUpperCase()} Order`
          )}
        </button>
      </div>
    </div>
  );
}
