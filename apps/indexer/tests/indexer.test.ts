import { describe, it, expect } from "vitest";
import { IndexerStore } from "../src/store.js";
import { parseDbcLogMessages } from "../src/parser.js";
import { createIndexerServer } from "../src/server.js";

describe("Indexer Core", () => {
  it("correctly parses swap and creation logs", () => {
    const logs = [
      "Program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN invoke [1]",
      "Program log: Instruction: Swap",
      "Program data: evtSwap abc123==",
      "Program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN success",
    ];

    const events = parseDbcLogMessages("sig123", 100, logs);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === "swap")).toBe(true);
  });

  it("stores and queries pools and swaps with aggregations", () => {
    const store = new IndexerStore();

    store.upsertPool({
      poolAddress: "pool1",
      configAddress: "config1",
      baseMint: "mint1",
      quoteMint: "So11111111111111111111111111111111111111112",
      name: "Test Token",
      symbol: "TEST",
      uri: "https://example.com/meta.json",
      creator: "creator1",
      createdAt: 1000,
      updatedAt: 1000,
      isMigrated: false,
      virtualBaseReserve: "1000000",
      virtualQuoteReserve: "500000",
      realQuoteReserve: "25",
      targetQuoteReserve: "85",
      migrationProgressPercentage: 29.4,
      totalVolumeQuote: "0",
      totalSwaps: 0,
      creatorTradingFeesCollected: "0",
      partnerTradingFeesCollected: "0",
    });

    store.addSwap({
      id: "swap1",
      poolAddress: "pool1",
      signature: "sig1",
      slot: 101,
      timestamp: 2000,
      user: "user1",
      direction: "buy",
      amountIn: "1.5",
      amountOut: "1000",
      feeAmount: "0.015",
      price: 0.0015,
    });

    const pool = store.getPool("pool1");
    expect(pool).toBeDefined();
    expect(pool?.totalSwaps).toBe(1);
    expect(pool?.totalVolumeQuote).toBe("1.5000");

    const stats = store.getStats();
    expect(stats.totalPools).toBe(1);
    expect(stats.activePools).toBe(1);
    expect(stats.migratedPools).toBe(0);
    expect(stats.totalSwaps).toBe(1);
  });

  it("handles migrations and updates pool status", () => {
    const store = new IndexerStore();
    store.upsertPool({
      poolAddress: "pool2",
      configAddress: "config2",
      baseMint: "mint2",
      quoteMint: "So11111111111111111111111111111111111111112",
      name: "Graduating Token",
      symbol: "GRAD",
      uri: "https://example.com/grad.json",
      creator: "creator2",
      createdAt: 1000,
      updatedAt: 1000,
      isMigrated: false,
      virtualBaseReserve: "1000000",
      virtualQuoteReserve: "500000",
      realQuoteReserve: "85",
      targetQuoteReserve: "85",
      migrationProgressPercentage: 100,
      totalVolumeQuote: "85",
      totalSwaps: 120,
      creatorTradingFeesCollected: "0.85",
      partnerTradingFeesCollected: "0.21",
    });

    store.markMigrated({
      poolAddress: "pool2",
      dammPoolAddress: "damm_pool_xyz",
      signature: "sig_mig",
      slot: 200,
      timestamp: 3000,
      migratedQuoteAmount: "85",
      migratedBaseAmount: "200000000",
    });

    const pool = store.getPool("pool2");
    expect(pool?.isMigrated).toBe(true);
    expect(pool?.dammPoolAddress).toBe("damm_pool_xyz");

    const stats = store.getStats();
    expect(stats.migratedPools).toBe(1);
    expect(stats.activePools).toBe(0);
  });
});
