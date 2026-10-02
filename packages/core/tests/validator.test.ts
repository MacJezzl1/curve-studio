import { describe, it, expect } from "vitest";
import { ConfigBuilder } from "../src/builder.js";
import { validateConfig } from "../src/validator.js";
import { BaseFeeMode, MigrationOption } from "../src/types.js";

describe("DBC Config Validator", () => {
  it("passes validation on a valid standard config", () => {
    const config = ConfigBuilder.create("Valid Config").build();
    const res = validateConfig(config);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  it("flags deprecated RateLimiter base fee mode with error", () => {
    const config = ConfigBuilder.create("RateLimiter Test").build();
    config.fee.baseFeeMode = BaseFeeMode.RateLimiter;
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "DEPRECATED_FEE_MODE")).toBe(true);
  });

  it("flags fee exceeding 9900 bps limit", () => {
    const config = ConfigBuilder.create("Excessive Fee").build();
    config.fee.feeSchedulerParam.startingFeeBps = 9950;
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "FEE_TOO_HIGH")).toBe(true);
  });

  it("flags fee below 25 bps minimum", () => {
    const config = ConfigBuilder.create("Tiny Fee").build();
    config.fee.feeSchedulerParam.startingFeeBps = 10;
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "FEE_TOO_LOW")).toBe(true);
  });

  it("flags liquidity allocation that does not sum to 100%", () => {
    const config = ConfigBuilder.create("Bad Split").build();
    config.liquidityDistribution.partnerPermanentLockedLiquidityPercentage = 50;
    // total is now 50%, missing 50%
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "SUPPLY_ALLOCATION_MISMATCH")).toBe(true);
  });

  it("flags locked liquidity under 10% threshold", () => {
    const config = ConfigBuilder.create("Thin Locked Liquidity").build();
    config.liquidityDistribution.partnerPermanentLockedLiquidityPercentage = 5;
    config.liquidityDistribution.partnerLiquidityPercentage = 95;
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "MIGRATION_LIQUIDITY_TOO_THIN")).toBe(true);
  });

  it("flags deprecated DAMM v1 migration option", () => {
    const config = ConfigBuilder.create("Legacy AMM").build();
    config.migration.migrationOption = MigrationOption.MET_DAMM;
    const res = validateConfig(config);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.code === "DEPRECATED_MIGRATION_OPTION")).toBe(true);
  });

  it("warns when leftover buffer is less than 1000", () => {
    const config = ConfigBuilder.create("Low Leftover").build();
    config.token.leftover = "500";
    const res = validateConfig(config);
    expect(res.warnings.some((w) => w.code === "LEFTOVER_BUFFER_TOO_SMALL")).toBe(true);
  });
});
