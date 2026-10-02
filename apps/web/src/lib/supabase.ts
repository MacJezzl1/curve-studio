import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface DatabasePool {
  id?: string;
  pool_address: string;
  config_address: string;
  base_mint: string;
  quote_mint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  preset_id?: string;
  network?: string;
  virtual_base_reserve?: number | string;
  virtual_quote_reserve?: number | string;
  real_quote_reserve?: number;
  target_quote_reserve?: number;
  migration_progress_pct?: number;
  is_migrated?: boolean;
  damm_pool_address?: string | null;
  total_volume_quote?: number;
  total_swaps?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseSwap {
  id?: string;
  signature: string;
  pool_address: string;
  user_address: string;
  direction: "buy" | "sell";
  amount_in: number;
  amount_out: number;
  fee_amount?: number;
  price: number;
  slot?: number;
  timestamp?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && (supabaseAnonKey || supabaseServiceRoleKey));
};

let clientInstance: SupabaseClient | null = null;
let adminClientInstance: SupabaseClient | null = null;

/**
 * Returns public Supabase client (using anon key).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
}

/**
 * Returns admin/service-role Supabase client for secure server-side API routes.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!adminClientInstance) {
    const key = supabaseServiceRoleKey || supabaseAnonKey;
    adminClientInstance = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClientInstance;
}
