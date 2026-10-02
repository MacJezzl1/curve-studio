import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { DbcAdapter } from "@curve-studio/chain";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { poolAddress, network = "devnet" } = await request.json();

    if (!poolAddress) {
      return NextResponse.json({ error: "poolAddress is required" }, { status: 400 });
    }

    const rpcUrl =
      network === "mainnet-beta"
        ? process.env.SOLANA_MAINNET_RPC || clusterApiUrl("mainnet-beta")
        : process.env.SOLANA_DEVNET_RPC || clusterApiUrl("devnet");

    const connection = new Connection(rpcUrl, "confirmed");
    const adapter = new DbcAdapter(connection);
    const poolPubkey = new PublicKey(poolAddress);

    // Read live on-chain state
    const poolState = await adapter.getPoolState(poolPubkey);
    if (!poolState) {
      return NextResponse.json({ error: "Pool account not found on-chain", poolAddress }, { status: 404 });
    }

    const progress = await adapter.getPoolProgress(poolPubkey);

    const updatePayload = {
      pool_address: poolAddress,
      config_address: poolState.poolState.config.toBase58(),
      base_mint: poolState.poolState.baseMint.toBase58(),
      migration_progress_pct: Number(progress.quoteProgressPercent.toFixed(2)),
      is_migrated: progress.isGraduated,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const admin = getSupabaseAdminClient()!;
      await admin
        .from("pools")
        .update(updatePayload)
        .eq("pool_address", poolAddress);
    }

    return NextResponse.json({
      success: true,
      poolAddress,
      progress,
      state: {
        config: poolState.poolState.config.toBase58(),
        baseMint: poolState.poolState.baseMint.toBase58(),
      },
    });
  } catch (err: any) {
    console.error("[API /api/sync POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Sync failed" }, { status: 500 });
  }
}
