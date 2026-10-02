# Curve Studio: Hackathon Demo & Evaluation Guide 🎬

This document outlines the step-by-step evaluation workflow for judges and developers reviewing **Curve Studio** for the Crypto World's Fair x Meteora Hackathon.

---

## 🛠️ Rapid Evaluation (5-Minute Tour)

### 1. Run the Test Suite (Mathematical Rigor & Parity)
```bash
npx turbo run test
```
**What to look for:**
- 40/40 tests passing across all packages.
- `@curve-studio/core`: Invariant checks, golden test vectors, property-based tests with `fast-check` proving curve monotonicity and no negative reserve overflows.
- `@curve-studio/chain`: **Parity harness** executing exact quotes against Meteora's SDK engine (`client.pool.getQuoteFromInputAmount`).
- `@curve-studio/mcp`: 7 MCP tools validated for AI agent execution.

### 2. Launch the Web Studio
```bash
pnpm --filter @curve-studio/web dev
```
Navigate to: `http://localhost:3000`

---

## 🌐 Walkthrough Flow

### Step 1: Design & Interactive Simulation (`/`)
1. **Explore the Piecewise Curve Visualizer**:
   - The interactive Recharts canvas plots the bonding curve segments from initial price to graduation price.
   - Adjust the **Steepness Exponent**, **Number of Segments (1-8)**, and **Migration Target Reserve (SOL)**.
   - Notice the live-updating Price Trajectory, Reserve Ratio, and Liquidity Depth charts.
2. **Stress-Test Scenarios**:
   - Run the **Whale Dump** scenario: Watch how the curve absorbs a large sell order and view the resulting **Max Drawdown %**.
   - Run the **Bot Sniping** scenario: Observe how the anti-snipe fee decay scheduler collects punitive fees from early bots and penalizes sniper extraction.
   - Inspect the **Gini Fairness Score** (0-1.0) and **Sniper Resistance Score** (0-100).
3. **On-Chain Invariant Validator**:
   - Try entering an invalid trading fee (e.g. 10 bps).
   - The validator banner instantly flags `FEE_TOO_LOW` (Meteora requires >= 25 bps) with suggested fixes before any transaction can be compiled.

### Step 2: Preset Marketplace (`/presets`)
1. Click **Presets** in the navigation bar.
2. Browse the 5 production financial mechanisms:
   - **Tokenized Stock / Equity**: Flat 25 bps fee, 100% permanently locked DAMM v2 liquidity.
   - **Anti-Snipe Fair Meme**: 500 bps -> 100 bps exponential fee decay over 15 minutes.
   - **RWA Long-Tail Accumulator**: 4 shallow segments, 15% custody fee routing.
   - **Autonomous AI Agent**: 25% continuous trading fee split to on-chain compute treasury.
   - **Conviction Pool**: Dual-stage graduation into DAMM v2 + concentrated DLMM staking pool.
3. Click **"Load into Studio"** on any card to inspect and tweak the parameters.

### Step 3: Safe Launch & Deployment (`/deploy`)
1. Switch between **Devnet** and **Mainnet**.
2. Notice the **Safety Guard**: If Mainnet is selected, deployment is strictly locked until the user explicitly types `"DEPLOY TO MAINNET"`.
3. Connect your Solana wallet (Phantom, Solflare, etc.).
4. The deployment pipeline runs in two transparent stages:
   - **Stage 1**: Create on-chain DBC Configuration Account.
   - **Stage 2**: Initialize DBC Virtual Pool and Base Token Mint.
5. All transactions are compiled as unsigned envelopes; the user signs securely through their wallet.

### Step 4: Live Curve Trading (`/trade`)
1. Paste any deployed DBC pool address (or test on Devnet).
2. Execute **Buy** or **Sell** swaps:
   - Choose between Exact In or Partial Fill swap modes.
   - View real-time price impact, minimum amount out with slippage protection, and pool curve progress bar.

### Step 5: Protocol Fee Claiming (`/claim`)
1. Navigate to `/claim`.
2. Enter the pool address to view accumulated trading fees in real time:
   - **Creator Trading Fees**: Accumulated SOL and base token fees ready for claiming by the token creator.
   - **Partner Protocol Fees**: Fees accrued to the platform fee claimer.
3. One-click claim triggers atomic claim instructions via the DBC adapter.

---

## 🤖 AI Agent Tour (MCP Server)

Curve Studio exposes a complete Model Context Protocol (MCP) server for Claude Desktop, Cursor, and Antigravity:

### Run MCP Server
```bash
node packages/mcp/dist/bin.js
```

### Try Agent Prompts:
1. *"Show me the available bonding curve presets for tokenized equities."* -> Calls `list_presets(assetClass: "Equity")`.
2. *"Validate this bonding curve configuration with 10 bps fee."* -> Calls `validate_config` and flags the 25 bps protocol minimum.
3. *"Simulate an AI agent token launch under whale dump stress."* -> Calls `simulate_config` and returns slippage, Gini fairness, and price trajectories.
4. *"Generate unsigned launch transactions for devnet."* -> Calls `build_launch_tx` and returns safe serialized base64 transactions without touching private keys.
