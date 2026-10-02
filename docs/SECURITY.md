# Security, Auditing & Threat Model

Curve Studio is engineered under the assumption that it will be formally audited and used in mainnet environments handling real capital.

---

## 1. Core Principles & Guardrails
- **Zero Client-Side Private Keys**: No private keys or secret seeds are ever stored or handled by the Web App, MCP Server, or Agent Skills. Transactions are constructed as unsigned base64 payloads for external wallet signature.
- **Strict Network Gating**: Default Solana cluster is always `devnet`. Mainnet execution requires explicit configuration (`NEXT_PUBLIC_CLUSTER=mainnet-beta`), explicit UI confirmation dialogs, and simulated preflight validation.
- **Transaction Introspection**: UI previews and MCP transaction summaries are decoded directly from the compiled serialized instructions (verifying program IDs, instruction discriminators, recipient addresses, and transferred amounts), rather than trusting user form inputs.
- **Precision Financial Math**: Core bonding curve calculations use `BN` / `BigInt` / `decimal.js` integers and exact fixed-point fraction representations. No JavaScript IEEE 754 floats are used in state transitions or ledger accounting.

---

## 2. Threat Model

### 2.1 Malicious Preset Author
- **Threat**: A preset author attempts to inject a hidden fee recipient or steal funds by routing 100% of trading fees to an unadvertised wallet.
- **Mitigation**: The `Validator` inspects all fee claimers, creators, and percentage splits. The `Transaction Preview` explicitly breaks down every recipient account and warns the user if any recipient deviates from the user's connected wallet or documented protocol addresses.

### 2.2 Replay & Webhook Spoofing
- **Threat**: Malicious actors send spoofed webhook payloads to the indexer to fabricate graduation events or fake volume.
- **Mitigation**: Indexer validates cryptographic webhook signatures, re-verifies transactions on-chain against RPC, and ensures idempotent database writes.

### 2.3 Regulatory & Misrepresentation Safeguards
- Any presets tagged as Tokenized Equities or Real World Assets (RWAs) are strictly labeled as mechanism-testing and price-discovery tools. All demo assets carry explicit disclaimers: no real-world asset claim, no securities offering.
