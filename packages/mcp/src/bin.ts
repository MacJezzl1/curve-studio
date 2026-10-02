#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCurveStudioMcpServer } from "./server.js";

async function main() {
  const server = createCurveStudioMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[Curve Studio MCP] Server running on stdio.");
}

main().catch((err) => {
  console.error("[Curve Studio MCP] Fatal error:", err);
  process.exit(1);
});
