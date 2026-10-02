import { describe, it, expect } from "vitest";
import {
  handleListPresets,
  handleGetPreset,
  handleValidateConfig,
  handleSimulateConfig,
  handleCompareConfigs,
  handleBuildLaunchTx,
} from "../src/tools.js";
import { instantiatePreset } from "@curve-studio/presets";
import { Keypair } from "@solana/web3.js";

describe("MCP Server Tools", () => {
  it("lists all presets with financial metadata", async () => {
    const res = await handleListPresets({});
    expect(res.content).toHaveLength(1);
    const data = JSON.parse(res.content[0].text);
    expect(data.count).toBeGreaterThanOrEqual(5);
    expect(data.presets.some((p: any) => p.id === "stock-price-discovery")).toBe(true);
    expect(data.presets.some((p: any) => p.id === "ai-agent-token")).toBe(true);
  });

  it("filters presets by asset class", async () => {
    const res = await handleListPresets({ assetClass: "Equity / Stock" });
    const data = JSON.parse(res.content[0].text);
    expect(data.presets.length).toBe(1);
    expect(data.presets[0].id).toBe("stock-price-discovery");
  });

  it("retrieves full preset details and config", async () => {
    const res = await handleGetPreset({ presetId: "fair-meme" });
    const data = JSON.parse(res.content[0].text);
    expect(data.preset.id).toBe("fair-meme");
    expect(data.defaultConfig).toBeDefined();
    expect(data.validation.valid).toBe(true);
  });

  it("validates config invariants and flags violations", async () => {
    const validConfig = instantiatePreset("stock-price-discovery");
    const validRes = await handleValidateConfig({ config: validConfig });
    const validData = JSON.parse(validRes.content[0].text);
    expect(validData.valid).toBe(true);

    // Corrupt config with fee < 25 bps
    const invalidConfig = {
      ...validConfig,
      fee: {
        ...validConfig.fee,
        feeSchedulerParam: {
          ...validConfig.fee.feeSchedulerParam,
          startingFeeBps: 10, // 10 bps is below Meteora minimum 25 bps
        },
      },
    };
    const invalidRes = await handleValidateConfig({ config: invalidConfig });
    const invalidData = JSON.parse(invalidRes.content[0].text);
    expect(invalidData.valid).toBe(false);
    expect(invalidData.errors.length).toBeGreaterThan(0);
  });

  it("simulates bonding curve scenarios and outputs metrics", async () => {
    const simRes = await handleSimulateConfig({
      presetId: "fair-meme",
      scenario: "steady_accumulation",
      tradeCount: 15,
    });
    const simData = JSON.parse(simRes.content[0].text);
    expect(simData.scenario).toBe("steady_accumulation");
    expect(simData.metrics.totalVolumeQuoteSol).toBeGreaterThan(0);
    expect(simData.metrics.totalTradingFeesSol).toBeGreaterThan(0);
    expect(simData.priceTrajectorySamples.length).toBeGreaterThan(0);
  });

  it("compares multiple presets side-by-side", async () => {
    const compRes = await handleCompareConfigs({
      presets: ["stock-price-discovery", "fair-meme", "ai-agent-token"],
      tradeCount: 10,
    });
    const compData = JSON.parse(compRes.content[0].text);
    expect(compData.comparisons).toHaveLength(3);
    expect(compData.comparisons[0].id).toBe("stock-price-discovery");
    expect(compData.comparisons[0].lockedLiquidityPct).toBe(100);
  });

  it("enforces safety guard on mainnet launch without exact confirmation", async () => {
    const config = instantiatePreset("fair-meme");
    const payer = Keypair.generate().publicKey.toBase58();

    const blockedRes = await handleBuildLaunchTx({
      config,
      payer,
      name: "Test",
      symbol: "TEST",
      uri: "https://example.com",
      network: "mainnet-beta",
      mainnetConfirmation: "yes deploy please",
    });

    expect(blockedRes.isError).toBe(true);
    expect(blockedRes.content[0].text).toContain("SAFETY GUARD");
  });
});
