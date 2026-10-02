import { CurvePreset } from "../schema.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenType,
  TokenAuthorityOption,
  MigratedCollectFeeMode,
  DammV2DynamicFeeMode,
  DammV2BaseFeeMode,
} from "@curve-studio/core";

export const aiAgentTokenPreset: CurvePreset = {
  id: "ai-agent-token",
  name: "Autonomous AI Agent & Compute Engine",
  tagline: "Continuous fee streaming to autonomous agent treasury for model inference and compute.",
  category: "agent",
  description:
    "Built for autonomous AI agents, on-chain model swarms, and decentralized compute protocols. Continuously streams 25% of all bonding curve and DAMM v2 trading fees directly to the agent's autonomous treasury wallet, perpetually financing LLM inference and GPU compute cycles.",
  rationale:
    "AI agents require sustainable, autonomous cashflow to pay for OpenAI/Anthropic/DeepSeek API calls, RPC queries, and GPU instances. By baking a 25% creator fee share into both the DBC bonding curve and the migrated DAMM v2 pool, every trading volume surge generates real-time operational runway for the agent. The curve features balanced 50 bps trading fees and a smooth 2-segment ramp for automated micro-transactions.",
  recommendedQuoteToken: "SOL",
  targetAudience: "Autonomous AI agents, Eliza swarms, bot economies, decentralized compute networks, and agentic DAOs.",
  keyMechanics: [
    "25% creator trading fee share routed straight to the autonomous agent wallet",
    "Balanced 50 bps base trading fee for low-friction automated bot execution",
    "2-segment balanced curve with steepness exponent 1.0",
    "Perpetual fee streaming persists post-migration on DAMM v2",
    "100% permanent lock on protocol LP to secure token longevity",
  ],
  builderParams: {
    token: {
      tokenType: TokenType.SPLToken,
      baseDecimals: 6,
      quoteDecimals: 9, // SOL 9 decimals
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: "1000000000000000", // 1,000,000,000 tokens * 10^6
      leftover: "1000",
    },
    curve: {
      startPrice: 0.00000005, // 0.00000005 SOL
      migrationPrice: 0.0000004, // 8x price discovery corridor
      migrationTargetPercentage: 20,
      numSegments: 2,
      steepnessExponent: 1.0,
    },
    fee: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      startingFeeBps: 50, // 50 bps
      endingFeeBps: 50,
      numberOfPeriod: 0,
      totalDuration: 0,
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 25, // 25% of all fees to agent treasury
      poolCreationFee: "0",
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      feePercentage: 0,
      creatorFeePercentage: 25,
      migratedPoolFee: {
        poolFeeBps: 50,
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
    activationType: ActivationType.Timestamp,
  },
  simulationScenario: [
    { direction: "buy", amount: "10000000000", label: "Seed Inference Reserve (10 SOL)" },
    { direction: "buy", amount: "25000000000", label: "Agent Capability Upgrade Wave (25 SOL)" },
    { direction: "sell", amount: "50000000000000", label: "Compute Provider Swap Execution" },
    { direction: "buy", amount: "50000000000", label: "Autonomous Swarm Expansion (50 SOL)" },
  ],
  migrationPlan: {
    target: "DAMM_V2",
    poolFeeBps: 50,
    permanentLockedPercentage: 100,
    creatorFeeSharePercentage: 25,
  },
  tags: ["ai-agent", "compute", "streaming-fees", "autonomous", "treasury", "bot-friendly"],
};
