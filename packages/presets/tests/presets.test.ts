import { describe, it, expect } from "vitest";
import {
  ALL_PRESETS,
  getAllPresets,
  getPresetById,
  getPresetsByCategory,
  instantiatePreset,
  CurvePresetSchema,
} from "../src/index.js";
import { simulateTrades, validateDBCConfig } from "@curve-studio/core";
import BN from "bn.js";

describe("Curve Studio Presets Package", () => {
  it("should contain exactly 5 well-defined first-party presets", () => {
    const presets = getAllPresets();
    expect(presets).toHaveLength(5);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain("stock-price-discovery");
    expect(ids).toContain("fair-meme");
    expect(ids).toContain("rwa-long-tail");
    expect(ids).toContain("ai-agent-token");
    expect(ids).toContain("conviction-pool");
  });

  it("should validate all presets against the strict Zod schema", () => {
    for (const preset of ALL_PRESETS) {
      const parsed = CurvePresetSchema.safeParse(preset);
      expect(
        parsed.success,
        `Preset '${preset.id}' failed Zod schema validation: ${
          !parsed.success ? JSON.stringify(parsed.error.issues, null, 2) : ""
        }`
      ).toBe(true);
    }
  });

  it("should filter presets by category correctly", () => {
    expect(getPresetsByCategory("equity")).toHaveLength(1);
    expect(getPresetsByCategory("meme")).toHaveLength(1);
    expect(getPresetsByCategory("rwa")).toHaveLength(1);
    expect(getPresetsByCategory("agent")).toHaveLength(1);
    expect(getPresetsByCategory("conviction")).toHaveLength(1);
  });

  it("should instantiate all presets with ZERO invariant validation errors", () => {
    for (const preset of ALL_PRESETS) {
      const config = instantiatePreset(preset.id);
      expect(config).toBeDefined();

      const validation = validateDBCConfig(config);
      expect(
        validation.isValid,
        `Preset '${preset.id}' produced invalid DBCConfig: ${validation.errors
          .map((e) => e.message)
          .join(", ")}`
      ).toBe(true);
      expect(validation.errors).toHaveLength(0);
    }
  });

  it("should support overrides when instantiating presets", () => {
    const customized = instantiatePreset("fair-meme", {
      startingFeeBps: 750,
      endingFeeBps: 200,
    });
    expect(customized.fee.feeSchedulerParam.startingFeeBps).toBe(750);
    expect(customized.fee.feeSchedulerParam.endingFeeBps).toBe(200);

    const validation = validateDBCConfig(customized);
    expect(validation.isValid).toBe(true);
  });

  it("should execute full simulation scenarios for every preset", () => {
    for (const preset of ALL_PRESETS) {
      const config = instantiatePreset(preset.id);
      const trades = preset.simulationScenario.map((t) => ({
        direction: t.direction,
        amount: new BN(t.amount),
        label: t.label,
      }));

      const simResult = simulateTrades(config, trades);
      expect(simResult.steps).toHaveLength(trades.length);
      expect(simResult.totalVolumeQuote.gt(new BN(0))).toBe(true);
      expect(simResult.metrics.sniperResistanceScore).toBeGreaterThanOrEqual(0);
      expect(simResult.totalFeesProtocol.gte(new BN(0))).toBe(true);
      expect(simResult.steps[0]!.amountOut.gt(new BN(0))).toBe(true);

      // Sanity check price trajectory on buy: spotPriceAfter should be >= initial spot price
      const firstBuyIdx = trades.findIndex((t) => t.direction === "buy");
      if (firstBuyIdx >= 0) {
        expect(simResult.steps[firstBuyIdx]!.spotPriceAfter).toBeGreaterThanOrEqual(
          simResult.initialPrice
        );
      }
    }
  });
});
