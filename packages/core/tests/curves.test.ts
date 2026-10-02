import { describe, it, expect } from "vitest";
import BN from "bn.js";
import {
  generateCurve,
  CurveGenerationParams,
} from "../src/curves.js";
import { CurveFamily } from "../src/types.js";
import { sqrtPriceToPrice } from "../src/math.js";

describe("Curve Families Generator", () => {
  const defaultSupply = new BN("1000000000000000"); // 1B tokens with 6 decimals

  it("generates a monotonic flat curve", () => {
    const params: CurveGenerationParams = {
      family: CurveFamily.Flat,
      initialPrice: 0.0001,
      graduationPrice: 0.00011,
      tokenSupply: defaultSupply,
      segmentsCount: 4,
    };
    const res = generateCurve(params);
    expect(res.segments.length).toBe(4);
    expect(res.points.length).toBe(5);

    // Monotonicity check
    for (let i = 1; i < res.points.length; i++) {
      expect(res.points[i]!.price).toBeGreaterThan(res.points[i - 1]!.price);
      expect(res.points[i]!.sqrtPrice.gt(res.points[i - 1]!.sqrtPrice)).toBe(true);
    }

    // Supply allocation check
    const totalAllocated = res.segments.reduce((acc, s) => acc.add(s.baseAmount), new BN(0));
    // Within 0.1% of requested supply
    const diff = defaultSupply.sub(totalAllocated).abs();
    const ratio = diff.toNumber() / defaultSupply.toNumber();
    expect(ratio).toBeLessThan(0.001);
  });

  it("generates an exponential curve with proper geometric scaling", () => {
    const params: CurveGenerationParams = {
      family: CurveFamily.Exponential,
      initialPrice: 0.00001,
      graduationPrice: 0.0005,
      tokenSupply: defaultSupply,
      segmentsCount: 6,
    };
    const res = generateCurve(params);
    expect(res.segments.length).toBe(6);

    for (let i = 1; i < res.points.length; i++) {
      expect(res.points[i]!.price).toBeGreaterThan(res.points[i - 1]!.price);
    }

    // First point matches initial price, last point matches graduation price
    expect(res.points[0]!.price).toBeCloseTo(0.00001, 6);
    expect(res.points[res.points.length - 1]!.price).toBeCloseTo(0.0005, 5);
  });

  it("generates a long-tail curve with shallow accumulation and steep climb", () => {
    const params: CurveGenerationParams = {
      family: CurveFamily.LongTail,
      initialPrice: 0.00001,
      graduationPrice: 0.0004,
      pivotPrice: 0.00003,
      tokenSupply: defaultSupply,
      pivotSupplyRatio: 0.75,
    };
    const res = generateCurve(params);
    expect(res.segments.length).toBe(8); // 4 shallow + 4 steep

    // Check shallow phase slope vs steep phase slope
    const shallowDeltaP = res.points[4]!.price - res.points[0]!.price;
    const steepDeltaP = res.points[8]!.price - res.points[4]!.price;
    expect(steepDeltaP).toBeGreaterThan(shallowDeltaP);
  });

  it("generates a stepped curve with distinct price tranches", () => {
    const params: CurveGenerationParams = {
      family: CurveFamily.Stepped,
      initialPrice: 0.0001,
      graduationPrice: 0.0005,
      tokenSupply: defaultSupply,
      tranchesCount: 3,
    };
    const res = generateCurve(params);
    // 3 tranches + 2 step transitions = 5 segments
    expect(res.segments.length).toBe(5);

    for (let i = 1; i < res.points.length; i++) {
      expect(res.points[i]!.price).toBeGreaterThanOrEqual(res.points[i - 1]!.price);
    }
  });
});
