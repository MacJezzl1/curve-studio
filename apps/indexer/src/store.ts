import { IndexedPool, IndexedSwap, IndexedMigration, IndexerStats } from "./types.js";
import * as fs from "node:fs";
import * as path from "node:path";

export class IndexerStore {
  private pools: Map<string, IndexedPool> = new Map();
  private swaps: IndexedSwap[] = [];
  private migrations: Map<string, IndexedMigration> = new Map();
  private cacheFilePath?: string;
  private startTime: number = Date.now();
  private lastSlot: number = 0;

  constructor(cacheFilePath?: string) {
    this.cacheFilePath = cacheFilePath;
    if (this.cacheFilePath) {
      this.loadFromFile();
    }
  }

  public setLastSlot(slot: number): void {
    if (slot > this.lastSlot) {
      this.lastSlot = slot;
    }
  }

  public upsertPool(pool: IndexedPool): void {
    const existing = this.pools.get(pool.poolAddress);
    if (existing) {
      this.pools.set(pool.poolAddress, {
        ...existing,
        ...pool,
        updatedAt: Date.now(),
      });
    } else {
      this.pools.set(pool.poolAddress, {
        ...pool,
        updatedAt: Date.now(),
      });
    }
    this.saveToFileDebounced();
  }

  public getPool(poolAddress: string): IndexedPool | undefined {
    return this.pools.get(poolAddress);
  }

  public listPools(options?: {
    migrated?: boolean;
    creator?: string;
    limit?: number;
    offset?: number;
  }): { pools: IndexedPool[]; total: number } {
    let list = Array.from(this.pools.values());

    if (options?.migrated !== undefined) {
      list = list.filter((p) => p.isMigrated === options.migrated);
    }
    if (options?.creator) {
      list = list.filter((p) => p.creator.toLowerCase() === options.creator!.toLowerCase());
    }

    // Sort newest first
    list.sort((a, b) => b.createdAt - a.createdAt);

    const total = list.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    return {
      pools: list.slice(offset, offset + limit),
      total,
    };
  }

  public addSwap(swap: IndexedSwap): void {
    this.swaps.unshift(swap);
    if (this.swaps.length > 5000) {
      this.swaps.pop();
    }

    const pool = this.pools.get(swap.poolAddress);
    if (pool) {
      const currentVol = Number(pool.totalVolumeQuote) || 0;
      const swapVol = Number(swap.amountIn) || 0;
      pool.totalVolumeQuote = (currentVol + swapVol).toFixed(4);
      pool.totalSwaps += 1;
      pool.updatedAt = Date.now();
    }

    this.saveToFileDebounced();
  }

  public getSwapsForPool(poolAddress: string, limit: number = 50): IndexedSwap[] {
    return this.swaps.filter((s) => s.poolAddress === poolAddress).slice(0, limit);
  }

  public markMigrated(migration: IndexedMigration): void {
    this.migrations.set(migration.poolAddress, migration);
    const pool = this.pools.get(migration.poolAddress);
    if (pool) {
      pool.isMigrated = true;
      pool.dammPoolAddress = migration.dammPoolAddress;
      pool.migrationProgressPercentage = 100;
      pool.updatedAt = Date.now();
    }
    this.saveToFileDebounced();
  }

  public getStats(): IndexerStats {
    const pools = Array.from(this.pools.values());
    const migratedCount = pools.filter((p) => p.isMigrated).length;
    const totalVolume = pools.reduce(
      (sum, p) => sum + (Number(p.totalVolumeQuote) || 0),
      0
    );
    const totalSwaps = pools.reduce((sum, p) => sum + p.totalSwaps, 0);

    return {
      totalPools: pools.length,
      migratedPools: migratedCount,
      activePools: pools.length - migratedCount,
      totalVolumeSol: totalVolume,
      totalSwaps,
      lastIndexedSlot: this.lastSlot,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  private saveTimeout?: NodeJS.Timeout;
  private saveToFileDebounced(): void {
    if (!this.cacheFilePath) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
    }, 1000);
  }

  private saveToFile(): void {
    if (!this.cacheFilePath) return;
    try {
      const data = {
        pools: Array.from(this.pools.entries()),
        swaps: this.swaps.slice(0, 1000),
        migrations: Array.from(this.migrations.entries()),
        lastSlot: this.lastSlot,
      };
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error("[IndexerStore] Failed to write cache file:", err);
    }
  }

  private loadFromFile(): void {
    if (!this.cacheFilePath || !fs.existsSync(this.cacheFilePath)) return;
    try {
      const raw = fs.readFileSync(this.cacheFilePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.pools)) {
        this.pools = new Map(data.pools);
      }
      if (Array.isArray(data.swaps)) {
        this.swaps = data.swaps;
      }
      if (Array.isArray(data.migrations)) {
        this.migrations = new Map(data.migrations);
      }
      if (typeof data.lastSlot === "number") {
        this.lastSlot = data.lastSlot;
      }
    } catch (err) {
      console.error("[IndexerStore] Failed to load cache file:", err);
    }
  }
}
