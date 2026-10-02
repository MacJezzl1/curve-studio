"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { DBCConfig } from "@curve-studio/core";
import Decimal from "decimal.js";

interface CurveChartProps {
  config: DBCConfig;
  currentStepPrice?: number;
  quoteSymbol?: string;
}

export const CurveChart: React.FC<CurveChartProps> = ({
  config,
  currentStepPrice,
  quoteSymbol = "SOL",
}) => {
  // Generate curve plot data from config segments
  const data = React.useMemo(() => {
    const points: Array<{
      supplyPercent: number;
      supplySold: number;
      price: number;
      marketCap: number;
      segment: number;
    }> = [];

    const totalSupplyNum = new Decimal(config.token.totalTokenSupply)
      .div(10 ** config.token.baseDecimals)
      .toNumber();

    let cumulativeBase = 0;
    const numPointsPerSegment = 20;

    // Start point
    points.push({
      supplyPercent: 0,
      supplySold: 0,
      price: config.initialPrice,
      marketCap: config.initialPrice * totalSupplyNum,
      segment: 0,
    });

    for (let i = 0; i < config.segments.length; i++) {
      const seg = config.segments[i]!;
      const segBase = new Decimal(seg.baseAmount.toString())
        .div(10 ** config.token.baseDecimals)
        .toNumber();
      const segStartPrice = i === 0 ? config.initialPrice : points[points.length - 1]!.price;
      const segEndPrice = i === config.segments.length - 1 ? config.migrationPrice : (config.initialPrice + (config.migrationPrice - config.initialPrice) * ((i + 1) / config.segments.length));

      for (let p = 1; p <= numPointsPerSegment; p++) {
        const fraction = p / numPointsPerSegment;
        const currentBase = cumulativeBase + segBase * fraction;
        const currentPrice = segStartPrice + (segEndPrice - segStartPrice) * Math.pow(fraction, 1.1);
        const percent = Math.min(100, (currentBase / totalSupplyNum) * 100);

        points.push({
          supplyPercent: Math.round(percent * 100) / 100,
          supplySold: Math.round(currentBase),
          price: Number(currentPrice.toPrecision(5)),
          marketCap: Math.round(currentPrice * totalSupplyNum),
          segment: i + 1,
        });
      }
      cumulativeBase += segBase;
    }

    return points;
  }, [config]);

  const graduationThresholdPrice = config.migrationPrice;

  return (
    <div className="w-full h-80 rounded-xl glass-panel p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-meteora animate-ping" />
          <h3 className="text-sm font-semibold text-white tracking-wide">
            DYNAMIC BONDING CURVE GEOMETRY
          </h3>
          <span className="text-xs text-slate-400">
            ({config.segments.length} on-chain segments)
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-brand-meteora" />
            Spot Price ({quoteSymbol})
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Graduation: {graduationThresholdPrice.toPrecision(4)} {quoteSymbol}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2942" vertical={false} />
            <XAxis
              dataKey="supplyPercent"
              tickFormatter={(val) => `${val}%`}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              domain={["auto", "auto"]}
              tickFormatter={(val) =>
                val < 0.001 ? val.toExponential(1) : val.toFixed(4)
              }
              tickLine={false}
              orientation="right"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0]!.payload;
                  return (
                    <div className="rounded-lg bg-surface-card border border-surface-border p-3 shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-brand-meteora">
                        Segment {d.segment}
                      </div>
                      <div className="text-slate-300">
                        Supply Sold:{" "}
                        <span className="text-white font-mono font-medium">
                          {d.supplyPercent}% ({d.supplySold.toLocaleString()})
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Spot Price:{" "}
                        <span className="text-emerald-400 font-mono font-medium">
                          {d.price} {quoteSymbol}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Implied FDV:{" "}
                        <span className="text-white font-mono font-medium">
                          {d.marketCap.toLocaleString()} {quoteSymbol}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#00E5FF"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#curveGradient)"
            />
            {currentStepPrice && (
              <ReferenceLine
                y={currentStepPrice}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: "Sim Price",
                  fill: "#f59e0b",
                  fontSize: 10,
                  position: "insideTopLeft",
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
