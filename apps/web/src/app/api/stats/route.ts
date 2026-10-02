import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get("network") || "devnet";

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      source: "fallback_memory",
      network,
      totalPools: 14,
      migratedPools: 4,
      activePools: 10,
      totalVolumeSol: 1845.6,
      totalSwaps: 3420,
    });
  }

  const supabase = getSupabaseClient()!;

  // Query using RPC function or aggregate query
  const { data: statsData, error: rpcError } = await supabase.rpc("get_platform_stats", {
    p_network: network,
  });

  if (!rpcError && statsData) {
    return NextResponse.json({ source: "supabase_rpc", ...statsData });
  }

  // Fallback to direct query if RPC function wasn't executed
  const { data: pools, error } = await supabase
    .from("pools")
    .select("is_migrated, total_volume_quote, total_swaps")
    .eq("network", network);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalPools = pools ? pools.length : 0;
  const migratedPools = pools ? pools.filter((p) => p.is_migrated).length : 0;
  const totalVolumeSol = pools
    ? pools.reduce((acc, p) => acc + (Number(p.total_volume_quote) || 0), 0)
    : 0;
  const totalSwaps = pools
    ? pools.reduce((acc, p) => acc + (p.total_swaps || 0), 0)
    : 0;

  return NextResponse.json({
    source: "supabase",
    network,
    totalPools,
    migratedPools,
    activePools: totalPools - migratedPools,
    totalVolumeSol: Number(totalVolumeSol.toFixed(2)),
    totalSwaps,
  });
}
