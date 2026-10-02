# Architectural Decision Records (ADR) - Curve Studio

## ADR-001: Monorepo Architecture & Package Boundaries
- **Date**: 2026-10-02
- **Status**: Accepted
- **Context**: Curve Studio spans four application/tooling surfaces (Web app, MCP server, Agent skill, Indexer/API) powered by a shared mathematical core and Solana chain integration.
- **Decision**: 
  - Monorepo using `pnpm` workspaces + Turborepo.
  - Strict unidirectional dependency flow: `apps/*` and `packages/mcp` depend on `packages/chain`, `packages/presets`, `packages/core`.
  - `packages/core` is strictly pure and network-free (no `@solana/web3.js` network I/O, no RPC calls), containing only config builders, curve generators, validators, and simulators.
  - `packages/chain` isolates all Meteora SDK dependencies (`@meteora-ag/dynamic-bonding-curve-sdk`, `@meteora-ag/cp-amm-sdk`, `@meteora-ag/dlmm`) and Solana transaction building/sending.
- **Consequences**: Easy unit and property-based testing of simulator math without network mocks or blockchain latency; resilience against upstream SDK interface changes.

## ADR-002: Deterministic Precision Math
- **Date**: 2026-10-02
- **Status**: Accepted
- **Context**: Financial calculations, bonding curves, token amounts, and slippage in Solana DeFi must be exact and immune to binary floating point inaccuracies.
- **Decision**: Use `BN` / `BigInt` / `decimal.js` for all pricing, liquidity, token, and fee arithmetic across `core` and `chain`. Native `number` floats are permitted exclusively for chart visualization and UI displays.
- **Consequences**: Eliminates rounding exploits, off-by-one lamport mismatches, and simulator/on-chain discrepancies.

## ADR-003: Migration Target Strategy (DAMM v2 First)
- **Date**: 2026-10-02
- **Status**: Accepted
- **Context**: Meteora has deprecated DAMM v1 for new DBC pools and new DBC configs. DBC program strictly requires `MigrationOption.MET_DAMM_V2` for newly created configs and pools.
- **Decision**: Target DAMM v2 (`cp-amm`) as primary AMM graduation target for all presets. Provide optional conviction-pool DLMM flow post-graduation. Deprecate DAMM v1 in builder UI with informative warnings.
- **Consequences**: Full alignment with current Meteora on-chain program requirements and modern NFT-based LP positions.
