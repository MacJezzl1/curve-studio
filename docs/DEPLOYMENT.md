# Curve Studio: Vercel & Supabase Deployment Guide 🚀

This guide explains how to deploy **Curve Studio** with the **Frontend & Backend API on Vercel** and **PostgreSQL + Realtime on Supabase**.

---

## 🏛️ Architecture Overview

- **Frontend (Vercel Edge/CDN)**: Next.js 14 App Router delivering the glassmorphic Studio UI, Recharts charts, and Solana Wallet Adapter.
- **Backend API (Vercel Serverless Functions)**:
  - `GET /api/pools`: Query live/migrated DBC pools with filters and pagination.
  - `POST /api/pools`: Register newly deployed bonding curve pools.
  - `GET /api/pools/:address`: Fetch single pool reserves, parameters, and trade history.
  - `POST /api/pools/:address`: Record trade swaps post-transaction.
  - `GET /api/stats`: Aggregate volume, swaps, and graduation stats.
  - `POST /api/sync`: On-demand or scheduled synchronization of on-chain reserves to Supabase.
- **Database (Supabase PostgreSQL & Realtime)**: Managed database storing pools, swap transactions, and real-time live events.

---

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In your Supabase project dashboard:
   - Click on **SQL Editor** in the left sidebar.
   - Click **New Query**.
   - Copy and paste the entire contents of [`supabase/schema.sql`](file:///c:/Users/Admin/Documents/curve/supabase/schema.sql) into the query editor.
   - Click **Run**.
3. Retrieve your API Keys:
   - Navigate to **Project Settings** (gear icon) $\to$ **API**.
   - Copy the following values:
     - **Project URL** (`https://xyzcompany.supabase.co`)
     - **anon / public key** (`eyJhbGciOi...`)
     - **service_role key** (`eyJhbGciOi...` - keep this secret!)

---

## Step 2: Deploy to Vercel

### Option A: Import via Vercel Dashboard (Fastest)

1. Go to [vercel.com](https://vercel.com) and click **"Add New..."** $\to$ **"Project"**.
2. Select your GitHub repository: **`MacJezzl1/curve-studio`**.
3. In the project configuration:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click `Edit` and select `apps/web` (or leave as root with `vercel.json` already configured).
4. Configure **Environment Variables**:
   Add the following variables in the Vercel dashboard:

   | Variable Name | Value | Description |
   |---------------|-------|-------------|
   | `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | Solana network cluster (`devnet` or `mainnet-beta`) |
   | `NEXT_PUBLIC_SOLANA_DEVNET_RPC` | `https://api.devnet.solana.com` | Solana Devnet RPC endpoint |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase Anon Key (public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Supabase Service Role Key (server-only) |

5. Click **Deploy**. Vercel will build and deploy the Next.js app in under 2 minutes!

---

## Step 3: Local Development with Supabase

To test locally with your Supabase database:

1. Create `apps/web/.env.local`:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```
2. Paste your Supabase URL and keys into `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
3. Start the Next.js development server:
   ```bash
   pnpm --filter @curve-studio/web dev
   ```
   Open `http://localhost:3000` to test the frontend and API routes.

---

## Step 4: Verification Checklist

- [ ] Visit `https://your-app.vercel.app/` — verify Studio loads with charts.
- [ ] Visit `https://your-app.vercel.app/api/stats` — verify JSON returns platform stats from Supabase.
- [ ] Visit `https://your-app.vercel.app/api/pools` — verify list of pools.
- [ ] Visit `https://your-app.vercel.app/presets` — verify 5 presets load.
- [ ] Connect Solana Wallet on Devnet and test deployment.
