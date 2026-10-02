import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import BN from "bn.js";
import {
  ALL_PRESETS,
  getPresetById,
  instantiatePreset,
} from "@curve-studio/presets";
import {
  validateDBCConfig,
  simulateTrades,
  DBCConfig,
  TradeInput,
} from "@curve-studio/core";
import { DbcAdapter } from "@curve-studio/chain";

/**
 * 1. Tool: list_presets
 */
export async function handleListPresets(args: { assetClass?: string }) {
  let presets = ALL_PRESETS;
  if (args.assetClass) {
    const filter = args.assetClass.toLowerCase();
    presets = presets.filter(
      (p) =>
        filter.includes(p.category.toLowerCase()) ||
        p.category.toLowerCase().includes(filter) ||
        p.tags.some((t) => t.toLowerCase().includes(filter) || filter.includes(t.toLowerCase()))
    );
  }

  const result = presets.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    description: p.description,
    rationale: p.rationale,
    targetAudience: p.targetAudience,
    recommendedQuoteToken: p.recommendedQuoteToken,
    tags: p.tags,
    keyMechanics: p.keyMechanics,
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ count: result.length, presets: result }, null, 2),
      },
    ],
  };
}

/**
 * 2. Tool: get_preset
 */
export async function handleGetPreset(args: { presetId: string }) {
  const preset = getPresetById(args.presetId);
  if (!preset) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Preset '${args.presetId}' not found. Available presets: ${ALL_PRESETS.map((p) => p.id).join(", ")}`,
        },
      ],
    };
  }

  const instantiatedConfig = instantiatePreset(preset.id);
  const validation = validateDBCConfig(instantiatedConfig);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            preset: {
              id: preset.id,
              name: preset.name,
              category: preset.category,
              description: preset.description,
              rationale: preset.rationale,
              keyMechanics: preset.keyMechanics,
              migrationPlan: preset.migrationPlan,
            },
            defaultConfig: instantiatedConfig,
            validation,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * 3. Tool: validate_config
 */
export async function handleValidateConfig(args: { config: any }) {
  try {
    const validation = validateDBCConfig(args.config);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              valid: validation.valid,
              errors: validation.errors,
              warnings: validation.warnings,
              rulesSummary: {
                feeRangeValid: !validation.errors.some((e) => (e.field || "").includes("fee")),
                liquiditySumValid: !validation.errors.some((e) => (e.field || "").includes("liquidity")),
                segmentsValid: !validation.errors.some((e) => (e.field || "").includes("curve")),
              },
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Failed to validate config: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}

/**
 * 4. Tool: simulate_config
 */
export async function handleSimulateConfig(args: {
  config?: any;
  presetId?: string;
  scenario?: "whale_dump" | "retail_fomo" | "steady_accumulation" | "custom";
  tradeCount?: number;
  customSwaps?: Array<{ direction: "buy" | "sell"; amount: number }>;
}) {
  try {
    let config: DBCConfig;
    if (args.config) {
      config = args.config;
    } else if (args.presetId) {
      config = instantiatePreset(args.presetId);
    } else {
      config = instantiatePreset("fair-meme");
    }

    const tradeCount = args.tradeCount || 50;
    const scenario = args.scenario || "steady_accumulation";
    const trades: TradeInput[] = [];

    if (scenario === "custom" && args.customSwaps) {
      for (let i = 0; i < args.customSwaps.length; i++) {
        const s = args.customSwaps[i]!;
        trades.push({
          direction: s.direction,
          amount: new BN(Math.floor(s.amount * 1e9).toString()),
          walletId: `custom_${i}`,
        });
      }
    } else if (scenario === "whale_dump") {
      for (let i = 0; i < 15; i++) {
        trades.push({ direction: "buy", amount: new BN("1000000000"), walletId: `retail_${i}` });
      }
      trades.push({ direction: "sell", amount: new BN("10000000000000"), walletId: "whale_1" });
      trades.push({ direction: "sell", amount: new BN("8000000000000"), walletId: "whale_2" });
    } else if (scenario === "retail_fomo") {
      for (let i = 0; i < tradeCount; i++) {
        const isBuy = Math.random() > 0.2;
        trades.push({
          direction: isBuy ? "buy" : "sell",
          amount: new BN(Math.floor((0.2 + Math.random() * 1.5) * 1e9).toString()),
          walletId: `trader_${i}`,
        });
      }
    } else {
      // Steady accumulation
      for (let i = 0; i < tradeCount; i++) {
        trades.push({
          direction: "buy",
          amount: new BN(Math.floor(0.5 * 1e9).toString()),
          walletId: `buyer_${i}`,
        });
      }
    }

    const simResult = simulateTrades(config, trades);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              scenario,
              totalTrades: trades.length,
              metrics: {
                totalVolumeQuoteSol: Number(simResult.totalVolumeQuote.toString()) / 1e9,
                totalTradingFeesSol:
                  (Number(simResult.totalFeesCreator.toString()) +
                    Number(simResult.totalFeesPartner.toString()) +
                    Number(simResult.totalFeesProtocol.toString())) /
                  1e9,
                totalCreatorFeesSol: Number(simResult.totalFeesCreator.toString()) / 1e9,
                totalPartnerFeesSol: Number(simResult.totalFeesPartner.toString()) / 1e9,
                initialPrice: simResult.initialPrice,
                finalPrice: simResult.finalPrice,
                peakPrice: simResult.peakPrice,
                priceChangePercentage:
                  ((simResult.finalPrice - simResult.initialPrice) / simResult.initialPrice) * 100,
                isGraduated: simResult.isGraduated,
                graduationStep: simResult.graduationStep,
                quoteProgressPercent: simResult.quoteProgressPercent,
                baseProgressPercent: simResult.baseProgressPercent,
                fairnessScore: simResult.metrics.fairnessScore,
                sniperResistanceScore: simResult.metrics.sniperResistanceScore,
                maxDrawdownPercent: simResult.metrics.maxDrawdownPercent,
              },
              priceTrajectorySamples: simResult.steps.slice(0, 15).map((s) => ({
                step: s.step,
                price: s.spotPriceAfter,
              })),
              tradeStepsSample: simResult.steps.slice(0, 10).map((s) => ({
                step: s.step,
                direction: s.direction,
                spotPriceAfter: s.spotPriceAfter,
                feePaid: s.feeTotal.toString(),
                priceImpactBps: s.priceImpactBps,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Simulation error: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}

/**
 * 5. Tool: compare_configs
 */
export async function handleCompareConfigs(args: {
  presets: string[];
  tradeCount?: number;
}) {
  try {
    const tradeCount = args.tradeCount || 30;
    const trades: TradeInput[] = [];
    for (let i = 0; i < tradeCount; i++) {
      trades.push({
        direction: "buy",
        amount: new BN("1000000000"),
        walletId: `trader_${i}`,
      });
    }

    const comparisons = args.presets.map((id) => {
      const preset = getPresetById(id);
      if (!preset) return { id, error: "Preset not found" };

      const config = instantiatePreset(id);
      const sim = simulateTrades(config, trades);

      return {
        id,
        name: preset.name,
        category: preset.category,
        totalFeesSol:
          (Number(sim.totalFeesCreator.toString()) + Number(sim.totalFeesPartner.toString())) /
          1e9,
        finalPrice: sim.finalPrice,
        priceMultiplier: (sim.finalPrice / sim.initialPrice).toFixed(2) + "x",
        isGraduated: sim.isGraduated,
        quoteProgressPercent: sim.quoteProgressPercent,
        fairnessScore: sim.metrics.fairnessScore,
        sniperResistanceScore: sim.metrics.sniperResistanceScore,
        lockedLiquidityPct:
          config.liquidityDistribution.partnerPermanentLockedLiquidityPercentage +
          config.liquidityDistribution.creatorPermanentLockedLiquidityPercentage,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ comparisons }, null, 2),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Comparison error: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}

/**
 * 6. Tool: build_launch_tx
 */
export async function handleBuildLaunchTx(args: {
  config: any;
  payer: string;
  name: string;
  symbol: string;
  uri: string;
  network?: "devnet" | "mainnet-beta";
  mainnetConfirmation?: string;
}) {
  try {
    const network = args.network || "devnet";
    if (network === "mainnet-beta" && args.mainnetConfirmation !== "DEPLOY TO MAINNET") {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: "SAFETY GUARD: Mainnet deployment requires exact confirmation text 'DEPLOY TO MAINNET' in 'mainnetConfirmation'.",
          },
        ],
      };
    }

    const payerPubkey = new PublicKey(args.payer);
    const rpcUrl =
      network === "mainnet-beta"
        ? clusterApiUrl("mainnet-beta")
        : clusterApiUrl("devnet");
    const connection = new Connection(rpcUrl, "confirmed");
    const adapter = new DbcAdapter(connection);

    // Validate config first
    const validation = validateDBCConfig(args.config);
    if (!validation.valid) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Config validation failed: ${JSON.stringify(validation.errors)}`,
          },
        ],
      };
    }

    const configRes = await adapter.buildCreateConfigTx(args.config, {
      payer: payerPubkey,
    });

    const poolRes = await adapter.buildCreatePoolTx({
      configAddress: configRes.configAddress,
      payer: payerPubkey,
      name: args.name,
      symbol: args.symbol,
      uri: args.uri,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              network,
              configAddress: configRes.configAddress.toBase58(),
              poolAddress: poolRes.poolAddress.toBase58(),
              baseMint: poolRes.baseMintKeypair.publicKey.toBase58(),
              unsignedConfigTxBase64: configRes.transaction
                .serialize({ requireAllSignatures: false })
                .toString("base64"),
              unsignedPoolTxBase64: poolRes.transaction
                .serialize({ requireAllSignatures: false })
                .toString("base64"),
              instructionsCount: {
                configTx: configRes.transaction.instructions.length,
                poolTx: poolRes.transaction.instructions.length,
              },
              securityNotice:
                "Transactions are unsigned. Submit via your connected wallet adapter or sign locally.",
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Build launch transaction failed: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}

/**
 * 7. Tool: get_pool_state
 */
export async function handleGetPoolState(args: {
  poolAddress: string;
  network?: "devnet" | "mainnet-beta";
  rpcUrl?: string;
}) {
  try {
    const poolPubkey = new PublicKey(args.poolAddress);
    const rpc =
      args.rpcUrl ||
      (args.network === "mainnet-beta"
        ? clusterApiUrl("mainnet-beta")
        : clusterApiUrl("devnet"));

    const connection = new Connection(rpc, "confirmed");
    const adapter = new DbcAdapter(connection);

    const pool = await adapter.getPoolState(poolPubkey);
    if (!pool) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Pool account not found on-chain at ${args.poolAddress} (${args.network || "devnet"}).`,
          },
        ],
      };
    }

    const config = await adapter.getPoolConfig(pool.poolState.config);
    const progress = await adapter.getPoolProgress(poolPubkey);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              poolAddress: args.poolAddress,
              configAddress: pool.poolState.config.toBase58(),
              baseMint: pool.poolState.baseMint.toBase58(),
              quoteMint: config ? config.quoteMint.toBase58() : "UNKNOWN",
              quoteProgressPercent: progress.quoteProgressPercent,
              baseProgressPercent: progress.baseProgressPercent,
              isGraduated: progress.isGraduated,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Get pool state error: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}
