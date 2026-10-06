import { describe, it, expect } from "vitest";
import BN from "bn.js";
import { ConfigBuilder } from "../src/builder.js";
import { simulateTrades, Scenarios } from "../src/simulator.js";
import { CurveFamily } from "../src/types.js";

describe("Bonding Curve Simulator & Metrics", () => {
  const config = ConfigBuilder.create("Sim Test")
    .setCurveFamily(CurveFamily.Exponential)
    .setPriceRange(0.00001, 0.0002)
    .setFeeSchedule(100, 100) // 1%
    .setCreatorTradingFeePercentage(50)
    .build();

  it("simulates sequential buys and increases spot price monotonically", () => {
    const buyTrades = [
      { direction: "buy" as const, amount: new BN(1_000_000_000), walletId: "alice" }, // 1 SOL
      { direction: "buy" as const, amount: new BN(2_000_000_000), walletId: "bob" },   // 2 SOL
      { direction: "buy" as const, amount: new BN(5_000_000_000), walletId: "charlie" }, // 5 SOL
    ];

    const result = simulateTrades(config, buyTrades);
    expect(result.steps.length).toBe(3);

    expect(result.steps[0]!.spotPriceAfter).toBeGreaterThan(result.steps[0]!.spotPriceBefore);
    expect(result.steps[1]!.spotPriceAfter).toBeGreaterThan(result.steps[1]!.spotPriceBefore);
    expect(result.steps[2]!.spotPriceAfter).toBeGreaterThan(result.steps[2]!.spotPriceBefore);

    // Verify fee accounting
    expect(result.totalFeesProtocol.gt(new BN(0))).toBe(true);
    expect(result.totalFeesCreator.gt(new BN(0))).toBe(true);
    expect(result.totalFeesPartner.gt(new BN(0))).toBe(true);

    // Protocol gets 20% of fee, Creator gets 50% of remaining 80% = 40% of total
    expect(result.totalFeesCreator.gt(result.totalFeesProtocol)).toBe(true);
  });

  it("handles a buy followed by a sell correctly", () => {
    const trades = [
      { direction: "buy" as const, amount: new BN(2_000_000_000), walletId: "alice" },
    ];
    const buyResult = simulateTrades(config, trades);
    const tokensBought = buyResult.steps[0]!.amountOut;

    // Alice sells half her tokens
    const sellTrade = [
      { direction: "buy" as const, amount: new BN(2_000_000_000), walletId: "alice" },
      { direction: "sell" as const, amount: tokensBought.div(new BN(2)), walletId: "alice" },
    ];
    const sellResult = simulateTrades(config, sellTrade);
    expect(sellResult.steps.length).toBe(2);

    // Price should decrease on sell
    expect(sellResult.steps[1]!.spotPriceAfter).toBeLessThan(sellResult.steps[1]!.spotPriceBefore);
  });

  it("evaluates organic volume scenario and produces realistic metrics", () => {
    const organicTrades = Scenarios.organicFlow(15, new BN(500_000_000));
    const result = simulateTrades(config, organicTrades);

    expect(result.steps.length).toBe(15);
    expect(result.metrics.fairnessScore).toBeGreaterThan(0.5);
    expect(result.metrics.sniperResistanceScore).toBeGreaterThanOrEqual(0);
    expect(result.metrics.effectiveAverageEntryPrice).toBeGreaterThan(0);
  });

  it("evaluates whale entry scenario and flags max drawdown", () => {
    const whaleTrades = Scenarios.whaleEntry(
      new BN(20_000_000_000), // 20 SOL whale buy
      5,
      new BN(100_000_000)
    );
    const result = simulateTrades(config, whaleTrades);
    expect(result.steps.length).toBe(6);
    expect(result.peakPrice).toBeGreaterThan(result.initialPrice);
  });

  it("safely handles sell trade exhausting pool without freezing or infinite loop", () => {
    const stressTrades = [
      { direction: "buy" as const, amount: new BN(5_000_000_000), walletId: "user_1" }, // 5 SOL
      { direction: "buy" as const, amount: new BN(15_000_000_000), walletId: "user_2" }, // 15 SOL
      { direction: "sell" as const, amount: new BN("2000000000000"), walletId: "user_3" }, // 2M tokens
      { direction: "buy" as const, amount: new BN(30_000_000_000), walletId: "user_4" }, // 30 SOL
    ];
    const result = simulateTrades(config, stressTrades);
    expect(result.steps.length).toBe(4);
    expect(result.steps[2]!.direction).toBe("sell");
    expect(result.steps[2]!.spotPriceAfter).toBeLessThanOrEqual(result.steps[1]!.spotPriceAfter);
    expect(Number.isFinite(result.metrics.effectiveAverageEntryPrice)).toBe(true);
    expect(Number.isFinite(result.metrics.maxDrawdownPercent)).toBe(true);
  });
});
