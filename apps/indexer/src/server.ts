import * as http from "node:http";
import { IndexerStore } from "./store.js";

export function createIndexerServer(store: IndexerStore, port: number = 4000): http.Server {
  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    try {
      if (pathname === "/health" || pathname === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", service: "curve-studio-indexer", time: Date.now() }));
        return;
      }

      if (pathname === "/api/stats") {
        const stats = store.getStats();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(stats));
        return;
      }

      if (pathname === "/api/pools") {
        const migratedParam = url.searchParams.get("migrated");
        const limitParam = url.searchParams.get("limit");
        const offsetParam = url.searchParams.get("offset");
        const creatorParam = url.searchParams.get("creator");

        const migrated = migratedParam === "true" ? true : migratedParam === "false" ? false : undefined;
        const limit = limitParam ? parseInt(limitParam, 10) : 50;
        const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

        const result = store.listPools({
          migrated,
          creator: creatorParam || undefined,
          limit,
          offset,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      if (pathname.startsWith("/api/pools/")) {
        const poolAddress = pathname.replace("/api/pools/", "").trim();
        const pool = store.getPool(poolAddress);
        if (!pool) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Pool not found", poolAddress }));
          return;
        }

        const recentSwaps = store.getSwapsForPool(poolAddress, 20);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ pool, recentSwaps }));
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Route not found" }));
    } catch (err: any) {
      console.error("[IndexerServer] Request handler error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Internal server error" }));
    }
  });

  return server;
}
