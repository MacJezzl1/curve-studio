import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured, DatabasePool } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// In-memory fallback mock pools if Supabase credentials are not yet entered
const FALLBACK_POOLS: DatabasePool[] = [
  {
    pool_address: "DBCv4R8Tf9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9dev1",
    config_address: "CFG3a8Tf9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9cfg1",
    baseMint: "ACME7xK9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9mint1",
    base_mint: "ACME7xK9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9mint1",
    quote_mint: "So11111111111111111111111111111111111111112",
    name: "Acme Tokenized Equity",
    symbol: "ACME",
    uri: "https://raw.githubusercontent.com/MacJezzl1/curve-studio/main/presets/acme.json",
    creator: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    preset_id: "stock-price-discovery",
    network: "devnet",
    virtual_base_reserve: 1000000000,
    virtual_quote_reserve: 30000000000,
    real_quote_reserve: 42.5,
    target_quote_reserve: 85.0,
    migration_progress_pct: 50.0,
    is_migrated: false,
    total_volume_quote: 42.5,
    total_swaps: 68,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  } as any,
  {
    pool_address: "DBCm3a8Tf9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9meme1",
    config_address: "CFGm3a8Tf9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9cfg2",
    base_mint: "PEPE7xK9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9mint2",
    quote_mint: "So11111111111111111111111111111111111111112",
    name: "Anti-Snipe Frog",
    symbol: "FROG",
    uri: "https://raw.githubusercontent.com/MacJezzl1/curve-studio/main/presets/frog.json",
    creator: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    preset_id: "fair-meme",
    network: "devnet",
    virtual_base_reserve: 800000000,
    virtual_quote_reserve: 85000000000,
    real_quote_reserve: 85.0,
    target_quote_reserve: 85.0,
    migration_progress_pct: 100.0,
    is_migrated: true,
    damm_pool_address: "DAMM9u8HkLqVzP93hB1d8mN5wXe6yZa7kC9pool1",
    total_volume_quote: 142.8,
    total_swaps: 245,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get("network") || "devnet";
  const isMigrated = searchParams.get("is_migrated");
  const creator = searchParams.get("creator");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (!isSupabaseConfigured()) {
    let list = [...FALLBACK_POOLS].filter((p) => p.network === network);
    if (isMigrated !== null) {
      list = list.filter((p) => p.is_migrated === (isMigrated === "true"));
    }
    if (creator) {
      list = list.filter((p) => p.creator.toLowerCase() === creator.toLowerCase());
    }
    return NextResponse.json({
      source: "fallback_memory",
      notice: "Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable Supabase persistence.",
      total: list.length,
      pools: list.slice(offset, offset + limit),
    });
  }

  const supabase = getSupabaseClient()!;
  let query = supabase
    .from("pools")
    .select("*", { count: "exact" })
    .eq("network", network)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (isMigrated !== null) {
    query = query.eq("is_migrated", isMigrated === "true");
  }
  if (creator) {
    query = query.eq("creator", creator);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[API /api/pools] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: "supabase",
    total: count || (data ? data.length : 0),
    pools: data || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: DatabasePool = await request.json();

    if (!body.pool_address || !body.base_mint || !body.name || !body.creator) {
      return NextResponse.json(
        { error: "Missing required fields: pool_address, base_mint, name, creator" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      FALLBACK_POOLS.unshift({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        source: "fallback_memory",
        pool: body,
      });
    }

    const admin = getSupabaseAdminClient()!;
    const { data, error } = await admin
      .from("pools")
      .upsert(
        {
          ...body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "pool_address" }
      )
      .select()
      .single();

    if (error) {
      console.error("[API /api/pools POST] Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pool: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Invalid JSON payload" }, { status: 400 });
  }
}
