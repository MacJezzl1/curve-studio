import { Connection, PublicKey } from "@solana/web3.js";
import { METEORA_DBC_PROGRAM_ID, parseDbcLogMessages } from "./parser.js";
import { IndexerStore } from "./store.js";
import { IndexedPool, IndexedSwap } from "./types.js";

export class DbcLogMonitor {
  private connection: Connection;
  private store: IndexerStore;
  private isRunning: boolean = false;
  private subscriptionId: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private pollInterval?: NodeJS.Timeout;

  constructor(connection: Connection, store: IndexerStore) {
    this.connection = connection;
    this.store = store;
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[DbcLogMonitor] Starting monitor on program: ${METEORA_DBC_PROGRAM_ID.toBase58()}`);
    await this.subscribe();
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.subscriptionId !== null) {
      try {
        await this.connection.removeOnLogsListener(this.subscriptionId);
      } catch (err) {
        console.warn("[DbcLogMonitor] Error removing log listener:", err);
      }
      this.subscriptionId = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    console.log("[DbcLogMonitor] Monitor stopped.");
  }

  private async subscribe(): Promise<void> {
    try {
      this.subscriptionId = this.connection.onLogs(
        METEORA_DBC_PROGRAM_ID,
        (logs, ctx) => {
          this.handleLogs(logs.signature, ctx.slot, logs.logs, logs.err);
        },
        "confirmed"
      );
      this.reconnectAttempts = 0;
      console.log(`[DbcLogMonitor] Subscribed with ID: ${this.subscriptionId}`);
    } catch (err) {
      console.error("[DbcLogMonitor] Subscription error:", err);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (!this.isRunning) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[DbcLogMonitor] Max reconnect attempts reached. Falling back to polling mode.");
      this.startPollingFallback();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`[DbcLogMonitor] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
    setTimeout(() => {
      if (this.isRunning) {
        this.subscribe();
      }
    }, delay);
  }

  private startPollingFallback(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const slot = await this.connection.getSlot("confirmed");
        this.store.setLastSlot(slot);
      } catch (err) {
        console.warn("[DbcLogMonitor] Polling health check error:", err);
      }
    }, 15000);
  }

  public handleLogs(
    signature: string,
    slot: number,
    logs: string[] | null,
    err: any
  ): void {
    if (err || !logs) return;
    this.store.setLastSlot(slot);

    const parsedEvents = parseDbcLogMessages(signature, slot, logs);
    for (const evt of parsedEvents) {
      if (evt.type === "swap") {
        console.log(`[DbcLogMonitor] Indexed Swap: sig=${signature.slice(0, 8)}... slot=${slot}`);
      } else if (evt.type === "create_pool") {
        console.log(`[DbcLogMonitor] Indexed Pool Creation: sig=${signature.slice(0, 8)}... slot=${slot}`);
      } else if (evt.type === "migrate") {
        console.log(`[DbcLogMonitor] Indexed Migration to DAMM v2: sig=${signature.slice(0, 8)}... slot=${slot}`);
      }
    }
  }
}
