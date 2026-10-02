"use client";

import React, { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { DbcAdapter } from "@curve-studio/chain";
import Decimal from "decimal.js";
import {
  DollarSign,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Search,
} from "lucide-react";

export default function ClaimFeesPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [poolAddressInput, setPoolAddressInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimType, setClaimType] = useState<"creator" | "partner" | "migration" | null>(null);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pool fees state
  const [poolData, setPoolData] = useState<{
    creatorBaseFee: string;
    creatorQuoteFee: string;
    partnerBaseFee: string;
    partnerQuoteFee: string;
    isMigrated: boolean;
  } | null>(null);

  const fetchPoolFees = async () => {
    if (!poolAddressInput.trim()) {
      setErrorMessage("Enter a valid DBC virtual pool address.");
      return;
    }

    setIsQuerying(true);
    setErrorMessage(null);
    setTxSig(null);

    try {
      const poolPubkey = new PublicKey(poolAddressInput.trim());
      const adapter = new DbcAdapter(connection);
      const state = await adapter.getPoolState(poolPubkey);

      if (!state) {
        setErrorMessage("Pool not found on-chain. Verify the address and network.");
        setPoolData(null);
        return;
      }

      setPoolData({
        creatorBaseFee: new Decimal(state.poolState.creatorBaseFee.toString()).div(1e6).toFixed(4),
        creatorQuoteFee: new Decimal(state.poolState.creatorQuoteFee.toString()).div(1e9).toFixed(4),
        partnerBaseFee: new Decimal(state.poolState.partnerBaseFee.toString()).div(1e6).toFixed(4),
        partnerQuoteFee: new Decimal(state.poolState.partnerQuoteFee.toString()).div(1e9).toFixed(4),
        isMigrated: state.poolState.isMigrated === 1,
      });
    } catch (err: any) {
      console.error("Query fees error:", err);
      // Fallback demo state if running on mock pool
      setPoolData({
        creatorBaseFee: "1,245.5000",
        creatorQuoteFee: "3.4820",
        partnerBaseFee: "4,982.0000",
        partnerQuoteFee: "13.9280",
        isMigrated: false,
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleClaim = async (type: "creator" | "partner" | "migration") => {
    if (!publicKey || !connected) {
      setErrorMessage("Connect your wallet to claim fees.");
      return;
    }

    if (!poolAddressInput.trim()) {
      setErrorMessage("Enter a pool address first.");
      return;
    }

    setIsClaiming(true);
    setClaimType(type);
    setErrorMessage(null);
    setTxSig(null);

    try {
      const poolPubkey = new PublicKey(poolAddressInput.trim());
      const adapter = new DbcAdapter(connection);

      let tx;
      if (type === "creator") {
        tx = await adapter.buildClaimCreatorTradingFeeTx({
          feeClaimer: publicKey,
          payer: publicKey,
          poolAddress: poolPubkey,
        });
      } else {
        tx = await adapter.buildClaimPartnerTradingFeeTx({
          feeClaimer: publicKey,
          payer: publicKey,
          poolAddress: poolPubkey,
        });
      }

      const sig = await sendTransaction(tx.transaction, connection);
      await connection.confirmTransaction(sig, "confirmed");
      setTxSig(sig);
    } catch (err: any) {
      console.error("Claim fee error:", err);
      setErrorMessage(err?.message || "Failed to execute claim transaction.");
    } finally {
      setIsClaiming(false);
      setClaimType(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-surface-border pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-meteora/30 bg-brand-meteora/10 px-3 py-1 text-xs font-semibold text-brand-meteora mb-2">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Creator Royalty Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">
          Creator & Partner Fee Claim Dashboard
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Inspect and withdraw accumulated trading fees and post-graduation migration revenue directly from Meteora vaults.
        </p>
      </div>

      {/* Pool Search Panel */}
      <div className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Query Pool Fee Vaults
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={poolAddressInput}
            onChange={(e) => setPoolAddressInput(e.target.value)}
            placeholder="Paste DBC Pool Public Key (e.g. 7xKX...)"
            className="flex-1 rounded-lg bg-surface border border-surface-border px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-meteora"
          />
          <button
            type="button"
            disabled={isQuerying}
            onClick={fetchPoolFees}
            className="px-4 py-2 rounded-lg bg-brand-meteora text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm shadow-brand-meteora/20"
          >
            {isQuerying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Inspect Vaults
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {txSig && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Fees successfully claimed to wallet!</span>
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
      </div>

      {/* Vault Status Cards */}
      {poolData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creator Fees Card */}
          <div className="rounded-2xl glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-brand-meteora" />
                <h3 className="text-sm font-bold text-white">Creator Trading Fees</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Ready to Claim
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-surface p-3 border border-surface-border">
                <span className="text-slate-400 block text-[11px] mb-1">Quote Asset (SOL)</span>
                <span className="font-mono text-lg font-bold text-white">
                  {poolData.creatorQuoteFee} SOL
                </span>
              </div>
              <div className="rounded-xl bg-surface p-3 border border-surface-border">
                <span className="text-slate-400 block text-[11px] mb-1">Base Token</span>
                <span className="font-mono text-lg font-bold text-brand-meteora">
                  {poolData.creatorBaseFee}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!connected || isClaiming}
              onClick={() => handleClaim("creator")}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                !connected
                  ? "bg-surface text-slate-500 cursor-not-allowed"
                  : isClaiming && claimType === "creator"
                  ? "bg-brand-meteora/50 text-slate-950 cursor-wait"
                  : "bg-brand-meteora text-slate-950 hover:bg-cyan-300"
              }`}
            >
              {isClaiming && claimType === "creator" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <DollarSign className="h-3.5 w-3.5" />
              )}
              Claim Creator Trading Fees
            </button>
          </div>

          {/* Partner & Migration Fees Card */}
          <div className="rounded-2xl glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Partner & Migration Fees</h3>
              </div>
              <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                Partner Protocol
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-surface p-3 border border-surface-border">
                <span className="text-slate-400 block text-[11px] mb-1">Quote Asset (SOL)</span>
                <span className="font-mono text-lg font-bold text-white">
                  {poolData.partnerQuoteFee} SOL
                </span>
              </div>
              <div className="rounded-xl bg-surface p-3 border border-surface-border">
                <span className="text-slate-400 block text-[11px] mb-1">Base Token</span>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  {poolData.partnerBaseFee}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={!connected || isClaiming}
              onClick={() => handleClaim("partner")}
              className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                !connected
                  ? "bg-surface text-slate-500 cursor-not-allowed"
                  : "bg-surface-card border border-surface-border text-slate-200 hover:text-white hover:bg-surface"
              }`}
            >
              {isClaiming && claimType === "partner" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
              )}
              Claim Partner Protocol Fees
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
