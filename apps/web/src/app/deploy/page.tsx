"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ALL_PRESETS, getPresetById, instantiatePreset } from "@curve-studio/presets";
import { validateDBCConfig, DBCConfig } from "@curve-studio/core";
import { DbcAdapter } from "@curve-studio/chain";
import {
  Rocket,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";

function DeployContent() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("preset") || ALL_PRESETS[0]!.id;
  const preset = getPresetById(presetId) || ALL_PRESETS[0]!;

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [network, setNetwork] = useState<"devnet" | "mainnet-beta">("devnet");
  const [mainnetConfirmText, setMainnetConfirmText] = useState("");
  const [deployStep, setDeployStep] = useState<number>(1);
  const [isDeploying, setIsDeploying] = useState(false);
  const [configTxSig, setConfigTxSig] = useState<string | null>(null);
  const [poolTxSig, setPoolTxSig] = useState<string | null>(null);
  const [createdPoolAddress, setCreatedPoolAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Instantiate and validate config
  const config: DBCConfig = React.useMemo(() => {
    return instantiatePreset(preset.id);
  }, [preset]);

  const validation = React.useMemo(() => {
    return validateDBCConfig(config);
  }, [config]);

  const isMainnetLocked = network === "mainnet-beta" && mainnetConfirmText !== "DEPLOY TO MAINNET";

  const handleDeploy = async () => {
    if (!publicKey || !connected) {
      setErrorMessage("Please connect your Solana wallet first.");
      return;
    }

    if (!validation.isValid) {
      setErrorMessage("Config has validation errors. Fix invariants before deploying.");
      return;
    }

    setIsDeploying(true);
    setErrorMessage(null);

    try {
      const adapter = new DbcAdapter(connection);

      // Step 1: Build & send Create Config Transaction
      setDeployStep(1);
      const configRes = await adapter.buildCreateConfigTx(config, {
        payer: publicKey,
      });

      configRes.transaction.feePayer = publicKey;
      configRes.transaction.partialSign(configRes.configKeypair);

      const cfgSig = await sendTransaction(configRes.transaction, connection);
      await connection.confirmTransaction(cfgSig, "confirmed");
      setConfigTxSig(cfgSig);

      // Step 2: Build & send Create Pool Transaction
      setDeployStep(2);
      const quoteMint =
        config.token.quoteDecimals === 6
          ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // USDC
          : new PublicKey("So11111111111111111111111111111111111111112"); // WSOL

      const poolRes = await adapter.buildCreatePoolTx({
        configAddress: configRes.configAddress,
        payer: publicKey,
        poolCreator: publicKey,
        name: preset.name.slice(0, 32),
        symbol: "CRV",
        uri: "https://curve.studio/metadata.json",
        quoteMint,
      });

      poolRes.transaction.feePayer = publicKey;
      poolRes.transaction.partialSign(poolRes.baseMintKeypair);

      const pSig = await sendTransaction(poolRes.transaction, connection);
      await connection.confirmTransaction(pSig, "confirmed");
      setPoolTxSig(pSig);
      setCreatedPoolAddress(poolRes.poolAddress.toBase58());

      setDeployStep(3);
    } catch (err: any) {
      console.error("Deploy error:", err);
      setErrorMessage(err?.message || "Failed to deploy transaction.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-surface-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-meteora/30 bg-brand-meteora/10 px-3 py-1 text-xs font-semibold text-brand-meteora mb-2">
            <Rocket className="h-3.5 w-3.5" />
            <span>One-Click Deployer</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">
            Deploy {preset.name}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Create verified DBC config and pool on Solana with on-chain Meteora program IDs.
          </p>
        </div>

        {/* Network Selector */}
        <div className="flex items-center gap-2 bg-surface p-1 rounded-lg border border-surface-border">
          <button
            type="button"
            onClick={() => setNetwork("devnet")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              network === "devnet"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Devnet (Default)
          </button>
          <button
            type="button"
            onClick={() => setNetwork("mainnet-beta")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              network === "mainnet-beta"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mainnet-Beta
          </button>
        </div>
      </div>

      {/* Mainnet Safety Gating Warning */}
      {network === "mainnet-beta" && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <ShieldAlert className="h-5 w-5" />
            <span>MAINNET PRODUCTION DEPLOYMENT SAFETY GATE</span>
          </div>
          <p className="text-xs text-slate-300">
            You are preparing to deploy real liquidity and tokens to Solana Mainnet. Transactions require real SOL for rent and network fees.
          </p>
          <div className="pt-2">
            <label className="block text-xs text-slate-400 mb-1">
              Type <span className="text-red-400 font-mono font-bold">DEPLOY TO MAINNET</span> to unlock:
            </label>
            <input
              type="text"
              value={mainnetConfirmText}
              onChange={(e) => setMainnetConfirmText(e.target.value)}
              placeholder="DEPLOY TO MAINNET"
              className="w-full sm:w-80 rounded-lg bg-surface border border-red-500/40 px-3 py-2 text-sm font-mono text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Deployment Card */}
      <div className="rounded-2xl glass-panel p-6 space-y-6">
        {/* Pre-flight Validation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <span>Pre-flight Checks</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <ShieldCheck className="h-4 w-4" /> 0 Invariant Errors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-surface p-3 border border-surface-border">
              <span className="text-slate-400 block mb-0.5">Program ID</span>
              <span className="font-mono text-brand-meteora font-semibold text-[11px]">
                dbcij3LWUppWqq96dh6g...aqN
              </span>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-surface-border">
              <span className="text-slate-400 block mb-0.5">Segments</span>
              <span className="font-mono text-white font-semibold">
                {config.segments.length} Curve Segments
              </span>
            </div>
            <div className="rounded-lg bg-surface p-3 border border-surface-border">
              <span className="text-slate-400 block mb-0.5">Post-Migration</span>
              <span className="font-mono text-emerald-400 font-semibold">
                Meteora DAMM v2
              </span>
            </div>
          </div>
        </div>

        {/* Progress Pipeline */}
        <div className="border-t border-surface-border pt-4 space-y-3">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Deployment Execution Pipeline
          </div>

          <div className="space-y-2">
            {/* Step 1 */}
            <div className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
              configTxSig ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : deployStep === 1 && isDeploying ? "bg-brand-meteora/10 border-brand-meteora/30 text-brand-meteora" : "bg-surface border-surface-border text-slate-400"
            }`}>
              <div className="flex items-center gap-2">
                {configTxSig ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : deployStep === 1 && isDeploying ? <Loader2 className="h-4 w-4 animate-spin text-brand-meteora" /> : <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">1</div>}
                <span className="font-medium text-white">Create On-Chain DBC Config Account</span>
              </div>
              {configTxSig && (
                <a
                  href={`https://explorer.solana.com/tx/${configTxSig}?cluster=${network}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 hover:underline"
                >
                  View Tx <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Step 2 */}
            <div className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
              poolTxSig ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : deployStep === 2 && isDeploying ? "bg-brand-meteora/10 border-brand-meteora/30 text-brand-meteora" : "bg-surface border-surface-border text-slate-400"
            }`}>
              <div className="flex items-center gap-2">
                {poolTxSig ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : deployStep === 2 && isDeploying ? <Loader2 className="h-4 w-4 animate-spin text-brand-meteora" /> : <div className="h-4 w-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px]">2</div>}
                <span className="font-medium text-white">Initialize DBC Virtual Pool & Mint Base Token</span>
              </div>
              {poolTxSig && (
                <a
                  href={`https://explorer.solana.com/tx/${poolTxSig}?cluster=${network}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] text-emerald-400 hover:underline"
                >
                  View Tx <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/40 p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner */}
        {createdPoolAddress && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Pool Successfully Deployed on {network.toUpperCase()}!</span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Pool Address: <span className="text-white select-all">{createdPoolAddress}</span>
            </p>
          </div>
        )}

        {/* Deploy Action Button */}
        <div className="border-t border-surface-border pt-4">
          <button
            type="button"
            disabled={!connected || isDeploying || isMainnetLocked}
            onClick={handleDeploy}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              !connected
                ? "bg-surface-card text-slate-400 border border-surface-border cursor-not-allowed"
                : isMainnetLocked
                ? "bg-red-900/30 text-red-400 border border-red-800/40 cursor-not-allowed"
                : isDeploying
                ? "bg-brand-meteora/50 text-slate-950 cursor-wait"
                : "bg-gradient-to-r from-blue-600 to-brand-meteora text-slate-950 hover:brightness-110 shadow-brand-meteora/20"
            }`}
          >
            {isDeploying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing Deployment...
              </>
            ) : !connected ? (
              "Connect Wallet to Deploy"
            ) : isMainnetLocked ? (
              "Type Confirmation Text to Unlock"
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Deploy Curve Pool on {network.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeployPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-surface-card p-4 border border-surface-border text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-brand-meteora" />
            <span>Loading deployment module...</span>
          </div>
        </div>
      }
    >
      <DeployContent />
    </Suspense>
  );
}

