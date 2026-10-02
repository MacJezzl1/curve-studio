-- ==============================================================================
-- CURVE STUDIO: SUPABASE DATABASE SCHEMA
-- For tracking Meteora DBC Pools, Swaps, Fees, and Migrations into DAMM v2
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. POOLS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.pools (
  id uuid primary key default uuid_generate_v4(),
  pool_address text not null unique,
  config_address text not null,
  base_mint text not null,
  quote_mint text not null default 'So11111111111111111111111111111111111111112',
  name text not null,
  symbol text not null,
  uri text not null,
  creator text not null,
  preset_id text default 'custom',
  network text not null default 'devnet',
  virtual_base_reserve numeric not null default 0,
  virtual_quote_reserve numeric not null default 0,
  real_quote_reserve numeric not null default 0,
  target_quote_reserve numeric not null default 85,
  migration_progress_pct numeric not null default 0,
  is_migrated boolean not null default false,
  damm_pool_address text,
  total_volume_quote numeric not null default 0,
  total_swaps integer not null default 0,
  creator_fees_collected numeric not null default 0,
  partner_fees_collected numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for lightning fast lookups & filtering
create index if not exists idx_pools_address on public.pools (pool_address);
create index if not exists idx_pools_creator on public.pools (creator);
create index if not exists idx_pools_base_mint on public.pools (base_mint);
create index if not exists idx_pools_is_migrated on public.pools (is_migrated);
create index if not exists idx_pools_network on public.pools (network);
create index if not exists idx_pools_created_at on public.pools (created_at desc);

-- ------------------------------------------------------------------------------
-- 2. SWAPS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.swaps (
  id uuid primary key default uuid_generate_v4(),
  signature text not null unique,
  pool_address text not null references public.pools(pool_address) on delete cascade,
  user_address text not null,
  direction text not null check (direction in ('buy', 'sell')),
  amount_in numeric not null,
  amount_out numeric not null,
  fee_amount numeric not null default 0,
  price numeric not null,
  slot bigint not null default 0,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_swaps_pool_address on public.swaps (pool_address);
create index if not exists idx_swaps_user_address on public.swaps (user_address);
create index if not exists idx_swaps_timestamp on public.swaps (timestamp desc);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.pools enable row level security;
alter table public.swaps enable row level security;

-- Allow ANYONE (including unauthenticated frontend clients) to read pools and swaps
create policy "Allow public read-only access on pools"
  on public.pools for select
  using (true);

create policy "Allow public read-only access on swaps"
  on public.swaps for select
  using (true);

-- Allow authenticated / service-role / API server to insert and update
create policy "Allow service_role insert on pools"
  on public.pools for insert
  with check (true);

create policy "Allow service_role update on pools"
  on public.pools for update
  using (true);

create policy "Allow service_role insert on swaps"
  on public.swaps for insert
  with check (true);

-- ------------------------------------------------------------------------------
-- 4. AGGREGATE STATS FUNCTION
-- ------------------------------------------------------------------------------
create or replace function public.get_platform_stats(p_network text default 'devnet')
returns json as $$
declare
  v_total_pools integer;
  v_migrated_pools integer;
  v_total_volume numeric;
  v_total_swaps integer;
begin
  select count(*),
         count(*) filter (where is_migrated = true),
         coalesce(sum(total_volume_quote), 0),
         coalesce(sum(total_swaps), 0)
  into v_total_pools, v_migrated_pools, v_total_volume, v_total_swaps
  from public.pools
  where network = p_network;

  return json_build_object(
    'network', p_network,
    'totalPools', v_total_pools,
    'migratedPools', v_migrated_pools,
    'activePools', v_total_pools - v_migrated_pools,
    'totalVolumeSol', v_total_volume,
    'totalSwaps', v_total_swaps
  );
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 5. REALTIME REPLICATION
-- ------------------------------------------------------------------------------
-- Publish pools and swaps tables to Supabase Realtime
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table public.pools, public.swaps;
commit;
