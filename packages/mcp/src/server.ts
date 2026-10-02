import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  handleListPresets,
  handleGetPreset,
  handleValidateConfig,
  handleSimulateConfig,
  handleCompareConfigs,
  handleBuildLaunchTx,
  handleGetPoolState,
} from "./tools.js";

export function createCurveStudioMcpServer(): McpServer {
  const server = new McpServer({
    name: "curve-studio-mcp",
    version: "0.1.0",
  });

  // Tool 1: list_presets
  server.tool(
    "list_presets",
    "List available Meteora DBC bonding curve presets with descriptions, target audiences, and financial mechanism rationales.",
    {
      assetClass: z
        .string()
        .optional()
        .describe("Optional filter by asset class: Meme, Equity / Stock, RWA, AI Agent, Staking / Governance"),
    },
    async (args) => {
      return handleListPresets(args);
    }
  );

  // Tool 2: get_preset
  server.tool(
    "get_preset",
    "Retrieve complete parameters, rationale, and initialized DBC configuration for a given preset ID.",
    {
      presetId: z
        .string()
        .describe("Preset identifier (e.g., 'stock-price-discovery', 'fair-meme', 'rwa-long-tail', 'ai-agent-token', 'conviction-pool')"),
    },
    async (args) => {
      return handleGetPreset(args);
    }
  );

  // Tool 3: validate_config
  server.tool(
    "validate_config",
    "Validate a Meteora Dynamic Bonding Curve (DBC) configuration against on-chain program invariants (fees >= 25 bps, liquidity sum = 100%, monotonic segments).",
    {
      config: z
        .any()
        .describe("Full DBCConfig object to validate"),
    },
    async (args) => {
      return handleValidateConfig(args);
    }
  );

  // Tool 4: simulate_config
  server.tool(
    "simulate_config",
    "Simulate market dynamics on a DBC bonding curve under realistic trading scenarios (steady accumulation, whale dump, retail fomo, or custom swap batches).",
    {
      presetId: z
        .string()
        .optional()
        .describe("Preset ID to use as the base curve (if config not provided)"),
      config: z
        .any()
        .optional()
        .describe("Custom DBCConfig object (takes precedence over presetId)"),
      scenario: z
        .enum(["whale_dump", "retail_fomo", "steady_accumulation", "custom"])
        .optional()
        .describe("Preset scenario archetype to execute"),
      tradeCount: z
        .number()
        .optional()
        .describe("Number of trades to simulate (default 50)"),
      customSwaps: z
        .array(
          z.object({
            direction: z.enum(["buy", "sell"]),
            amount: z.number().describe("Swap amount in SOL or quote asset"),
          })
        )
        .optional()
        .describe("Array of explicit trades if scenario is 'custom'"),
    },
    async (args) => {
      return handleSimulateConfig(args);
    }
  );

  // Tool 5: compare_configs
  server.tool(
    "compare_configs",
    "Compare 2-3 curve presets side-by-side using identical trading flow, evaluating slippage, price trajectory, and LP fee capture.",
    {
      presets: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe("Array of preset IDs to compare"),
      tradeCount: z
        .number()
        .optional()
        .describe("Number of buy trades to benchmark across all curves"),
    },
    async (args) => {
      return handleCompareConfigs(args);
    }
  );

  // Tool 6: build_launch_tx
  server.tool(
    "build_launch_tx",
    "Generate unsigned Solana transactions to create a Meteora DBC config and virtual launch pool. No private keys required.",
    {
      config: z.any().describe("Validated DBCConfig object"),
      payer: z.string().describe("Base58 Solana public key of the deployment payer / creator"),
      name: z.string().describe("Token display name"),
      symbol: z.string().describe("Token trading ticker symbol"),
      uri: z.string().describe("Token metadata JSON URI"),
      network: z.enum(["devnet", "mainnet-beta"]).optional().describe("Target Solana cluster (default devnet)"),
      mainnetConfirmation: z
        .string()
        .optional()
        .describe("Must be exactly 'DEPLOY TO MAINNET' if deploying to mainnet-beta"),
    },
    async (args) => {
      return handleBuildLaunchTx(args);
    }
  );

  // Tool 7: get_pool_state
  server.tool(
    "get_pool_state",
    "Fetch live on-chain virtual reserves, quote balance, and migration status for any deployed Meteora DBC pool.",
    {
      poolAddress: z.string().describe("Base58 Solana public key of the DBC pool"),
      network: z.enum(["devnet", "mainnet-beta"]).optional().describe("Solana cluster"),
      rpcUrl: z.string().optional().describe("Optional custom Solana RPC endpoint"),
    },
    async (args) => {
      return handleGetPoolState(args);
    }
  );

  return server;
}
