import { describe, it, expect } from "vitest";
import BN from "bn.js";
import { ConfigBuilder, CurveFamily } from "@curve-studio/core";
import { ParityHarness } from "../src/parity.js";

describe("Parity Harness (Core Simulator vs SDK Math)", () => {
  it("verifies trade simulation amounts are consistent across simulator and SDK engine", async () => {
    const config = ConfigBuilder.create("Parity Test Pool")
      .setCurveFamily(CurveFamily.Exponential)
      .setPriceRange(0.00001, 0.0002)
      .setFeeSchedule(100, 100)
      .build();

    const trades = [
      { direction: "buy" as const, amount: new BN("500000000") }, // 0.5 SOL
      { direction: "buy" as const, amount: new BN("1000000000") }, // 1.0 SOL
    ];

    const report = await ParityHarness.compareSimulationWithSdk(config, trades);
    expect(report.totalStepsTested).toBe(2);
    expect(report.comparisons.length).toBe(2);
    expect(report.maxRelativeErrorPercent).toBeLessThan(0.05); // Within 5 bps tolerance
    expect(report.allWithinTolerance).toBe(true);
  });
});
