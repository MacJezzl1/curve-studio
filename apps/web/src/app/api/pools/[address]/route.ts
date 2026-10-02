import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured, DatabaseSwap } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { address: string } }
) {
  const poolAddress = params.address;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      source: "fallback_memory",
      pool: {
        pool_address: poolAddress,
        name: "Demo Bonding Pool",
        symbol: "DEMO",
        virtual_base_reserve: 1000000000,
        virtual_quote_reserve: 30000000000,
        real_quote_reserve: 30.0,
        target_quote_reserve: 85.0,
        migration_progress_pct: 35.2,
        is_migrated: false,
      },
      recentSwaps: [],
    });
  }

  const supabase = getSupabaseClient()!;

  const { data: pool, error: poolError } = await supabase
    .from("pools")
    .select("*")
    .eq("pool_address", poolAddress)
    .single();

  if (poolError || !pool) {
    return NextResponse.json({ error: "Pool not found", poolAddress }, { status: 404 });
  }

  const { data: recentSwaps } = await supabase
    .from("swaps")
    .select("*")
    .eq("pool_address", poolAddress)
    .order("timestamp", { ascending: false })
    .limit(50);

  return NextResponse.json({
    pool,
    recentSwaps: recentSwaps || [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const poolAddress = params.address;
    const body: DatabaseSwap = await request.json();

    if (!body.signature || !body.user_address || !body.direction) {
      return NextResponse.json({ error: "Missing required swap fields" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, source: "mock", swap: body });
    }

    const admin = getSupabaseAdminClient()!;

    // Insert swap
    const { data: swap, error: swapError } = await admin
      .from("swaps")
      .insert({
        ...body,
        pool_address: poolAddress,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (swapError) {
      console.error("[API /api/pools/:address POST] Swap insert error:", swapError);
      return NextResponse.json({ error: swapError.message }, { status: 500 });
    }

    // Atomically increment pool volume and swap count
    const { data: currentPool } = await admin
      .from("pools")
      .select("total_volume_quote, total_swaps")
      .eq("pool_address", poolAddress)
      .single();

    if (currentPool) {
      const newVol = (Number(currentPool.total_volume_quote) || 0) + (Number(body.amount_in) || 0);
      const newSwaps = (currentPool.total_swaps || 0) + 1;
      await admin
        .from("pools")
        .update({
          total_volume_quote: newVol,
          total_swaps: newSwaps,
          updated_at: new Date().toISOString(),
        })
        .eq("pool_address", poolAddress);
    }

    return NextResponse.json({ success: true, swap });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid payload" }, { status: 400 });
  }
}
