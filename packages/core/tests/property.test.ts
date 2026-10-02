import { describe, it, expect } from "vitest";
import fc from "fast-check";
import BN from "bn.js";
import { ConfigBuilder } from "../src/builder.js";
import { simulateTrades } from "../src/simulator.js";
import { CurveFamily } from "../src/types.js";

describe("Property-Based Invariant Tests (fast-check)", () => {
  it("fee is strictly bounded: fee never exceeds trade input", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 25, max: 9900 }), // feeBps
        fc.bigInt({ min: 100_000n, max: 10_000_000_000n }), // inputLamports
        (feeBps, inputAmount) => {
          const config = ConfigBuilder.create("Property Fee Test")
            .setCurveFamily(CurveFamily.Exponential)
            .setPriceRange(0.00001, 0.0001)
            .setFeeSchedule(feeBps, feeBps)
            .build();

          const result = simulateTrades(config, [
            { direction: "buy", amount: new BN(inputAmount.toString()) },
          ]);

          const step = result.steps[0]!;
          expect(step.feeTotal.lt(step.amountIn)).toBe(true);
          expect(step.feeTotal.gte(new BN(0))).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("price monotonicity: pure buy sequences never decrease price", () => {
    fc.assert(
      fc.property(
        fc.array(fc.bigInt({ min: 100_000n, max: 500_000_000n }), { minLength: 2, maxLength: 6 }),
        (buyAmounts) => {
          const config = ConfigBuilder.create("Property Monotonicity Test")
            .setCurveFamily(CurveFamily.Flat)
            .setPriceRange(0.00005, 0.00008)
            .build();

          const trades = buyAmounts.map((amt) => ({
            direction: "buy" as const,
            amount: new BN(amt.toString()),
          }));

          const result = simulateTrades(config, trades);
          for (let i = 1; i < result.steps.length; i++) {
            expect(result.steps[i]!.spotPriceAfter).toBeGreaterThanOrEqual(
              result.steps[i - 1]!.spotPriceAfter
            );
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it("graduation invariant: pool graduates iff quote reserve reaches threshold", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1_000_000n, max: 50_000_000_000n }),
        (buyAmount) => {
          const config = ConfigBuilder.create("Property Graduation Test")
            .setCurveFamily(CurveFamily.Exponential)
            .setPriceRange(0.00001, 0.0001)
            .build();

          const result = simulateTrades(config, [
            { direction: "buy", amount: new BN(buyAmount.toString()) },
          ]);

          const step = result.steps[0]!;
          const reached = step.quoteReserve.gte(config.migrationQuoteThreshold);
          expect(result.isGraduated).toBe(reached);
        }
      ),
      { numRuns: 40 }
    );
  });
});
