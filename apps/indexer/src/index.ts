import { Connection } from "@solana/web3.js";
import { IndexerStore } from "./store.js";
import { DbcLogMonitor } from "./monitor.js";
import { createIndexerServer } from "./server.js";
import * as path from "node:path";

export * from "./types.js";
export * from "./parser.js";
export * from "./store.js";
export * from "./monitor.js";
export * from "./server.js";

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const port = parseInt(process.env.PORT || "4000", 10);
  const cachePath = process.env.CACHE_PATH || path.join(process.cwd(), "indexer-cache.json");

  console.log("==========================================");
  console.log("  Curve Studio - Meteora DBC Indexer");
  console.log(`  RPC:  ${rpcUrl}`);
  console.log(`  Port: ${port}`);
  console.log("==========================================");

  const connection = new Connection(rpcUrl, "confirmed");
  const store = new IndexerStore(cachePath);
  const monitor = new DbcLogMonitor(connection, store);
  const server = createIndexerServer(store, port);

  server.listen(port, () => {
    console.log(`[IndexerServer] HTTP API listening at http://localhost:${port}`);
  });

  await monitor.start();

  const shutdown = async () => {
    console.log("\n[Indexer] Shutting down gracefully...");
    await monitor.stop();
    server.close(() => {
      console.log("[IndexerServer] HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("[Indexer] Fatal error:", err);
    process.exit(1);
  });
}
