import { describe, it, expect } from "vitest";
import BN from "bn.js";
import { ConfigBuilder } from "../src/builder.js";
import { simulateTrades } from "../src/simulator.js";
import { CurveFamily } from "../src/types.js";

describe("Golden Scenario Regression Tests", () => {
  it("matches fixed expected outcomes on canonical standard launch simulation", () => {
    const config = ConfigBuilder.create("Golden Launch")
      .setCurveFamily(CurveFamily.Exponential)
      .setPriceRange(0.000001, 0.00005)
      .setFeeSchedule(150, 150) // 1.5%
      .setCreatorTradingFeePercentage(50)
      .build();

    const trades = [
      { direction: "buy" as const, amount: new BN("1000000000"), walletId: "wallet_A" }, // 1 SOL
      { direction: "buy" as const, amount: new BN("2500000000"), walletId: "wallet_B" }, // 2.5 SOL
    ];

    const result = simulateTrades(config, trades);

    // Verify deterministic price and fee bounds
    expect(result.steps.length).toBe(2);
    expect(result.initialPrice).toBeCloseTo(0.000001, 7);
    expect(result.steps[0]!.amountIn.toString()).toBe("1000000000");
    // 1.5% of 1 SOL = 15,000,000 lamports fee
    expect(result.steps[0]!.feeTotal.toString()).toBe("15000000");
    // Protocol gets 20% of 15M = 3M
    expect(result.steps[0]!.feeProtocol.toString()).toBe("3000000");
    // Remaining 12M split 50/50 between partner and creator = 6M each
    expect(result.steps[0]!.feeCreator.toString()).toBe("6000000");
    expect(result.steps[0]!.feePartner.toString()).toBe("6000000");

    // Check step 1 results
    expect(result.steps[1]!.amountIn.toString()).toBe("2500000000");
    expect(result.steps[1]!.feeTotal.toString()).toBe("37500000");
    expect(result.steps[1]!.feeProtocol.toString()).toBe("7500000");
    expect(result.steps[1]!.feeCreator.toString()).toBe("15000000");
    expect(result.steps[1]!.feePartner.toString()).toBe("15000000");

    // Spot price must increase
    expect(result.steps[1]!.spotPriceAfter).toBeGreaterThan(result.steps[0]!.spotPriceAfter);
  });
});
