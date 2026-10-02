# Meteora Integration Notes (Source of Truth)

## 1. Verified Package Names & Pinned Versions

| Package | Pinned Version | Description |
|---|---|---|
| `@meteora-ag/dynamic-bonding-curve-sdk` | `1.5.13` | Meteora Dynamic Bonding Curve (DBC) client & math |
| `@meteora-ag/cp-amm-sdk` | `1.5.1` | Meteora DAMM v2 constant-product AMM client |
| `@meteora-ag/dlmm` | `1.9.14` | Meteora Dynamic Liquidity Market Maker (DLMM) client |
| `@solana/web3.js` | `1.98.0` | Solana JavaScript SDK |
| `@solana/spl-token` | `0.4.13` | SPL Token & Token-2022 helpers |
| `bn.js` | `5.2.1` | Big number support for on-chain integer math |
| `decimal.js` | `10.5.0` | High-precision decimal arithmetic |

## 2. On-Chain Program IDs

| Program | Public Mainnet / Devnet Program ID |
|---|---|
| Dynamic Bonding Curve (DBC) | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` |
| DAMM v2 (`cp-amm`) | `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` |
| DLMM (`lb_clmm`) | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` |
| DAMM v1 (Legacy AMM - Deprecated) | `Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB` |
| Locker Program | `LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn` |
| Dynamic Vault | `24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi` |
| Metaplex Metadata | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` |

## 3. DBC Config Specification & Constraints

### 3.1 Token Settings
- `tokenType`: `TokenType.SPLToken (0)` or `TokenType.Token2022 (1)`. Note: Token2022 requires DAMM v2 migration.
- `tokenBaseDecimal`: Range `6` to `9` (`TokenDecimal.SIX` to `TokenDecimal.NINE`). Standard is 6 or 9.
- `tokenQuoteDecimal`: Match quote mint (9 for SOL, 6 for USDC).
- `tokenAuthorityOption`:
  - `CreatorUpdateAuthority (0)`
  - `Immutable (1)`
  - `PartnerUpdateAuthority (2)`
  - `CreatorUpdateAndMintAuthority (3)` (Transfer-hook configs only)
  - `PartnerUpdateAndMintAuthority (4)` (Transfer-hook configs only)
- `totalTokenSupply`: e.g., 1,000,000,000 tokens (scaled by base decimals).
- `leftover`: Buffer amount for fixed-supply launches.

### 3.2 Fee Schedule & Rules
- Fee Denominator: `1,000,000,000` (1e9).
- Fee range: `MIN_FEE_BPS = 25` (0.25%), `MAX_FEE_BPS = 9900` (99%).
- `baseFeeMode`:
  - `FeeSchedulerLinear (0)`
  - `FeeSchedulerExponential (1)`
  - `RateLimiter (2)` (**DEPRECATED** for new configs and new pools. Standard configs reject `RateLimiter`).
- `collectFeeMode`: `CollectFeeMode.QuoteToken (0)` or `OutputToken (1)`.
- Split rules:
  - Protocol trading fee cut: 20% (`PROTOCOL_FEE_PERCENT = 20`).
  - Referral cut: 20% of protocol fee (`HOST_FEE_PERCENT = 20`).
  - Creator share: `creatorTradingFeePercentage` (0% to 100% of non-protocol fee).
  - Partner share: remainder (`100 - creatorTradingFeePercentage`).
- Pool creation fee: 0, or between 0.001 SOL (`1_000_000` lamports) and 100 SOL (`100_000_000_000` lamports). Split: 10% protocol, 90% partner.

### 3.3 Universal Curve Representation
- Curve points: max `MAX_CURVE_POINT = 16` points (15 segments).
- Each segment has a lower `sqrtPrice`, upper `sqrtPrice`, and `liquidity`.
- `MIN_SQRT_PRICE = 4295048016`, `MAX_SQRT_PRICE = 79226673521066979257578248091`.
- Helpers:
  - `buildCurveWithCustomSqrtPrices`
  - `buildCurveWithMarketCap`
  - `buildCurveWithTwoSegments`
  - `buildCurveWithMidPrice`
  - `buildCurveWithLiquidityWeights`

### 3.4 Migration Parameters (DBC -> DAMM v2)
- `migrationOption`: `MigrationOption.MET_DAMM_V2 (1)`. (`MET_DAMM` v1 is deprecated and rejected for new configs).
- `migrationFeeOption`: `MigrationFeeOption.Customizable (6)` or fixed bps options.
- `migrationFee`: `{ feePercentage (0 to 99), creatorFeePercentage (0 to 100) }`.
- Protocol migration fee: 0.2% fixed protocol liquidity fee applied automatically at graduation.
- `migratedPoolFee`:
  - `collectFeeMode`: `MigratedCollectFeeMode.QuoteToken (0)`, `OutputToken (1)`, or `Compounding (2)`.
  - `dynamicFee`: `DammV2DynamicFeeMode.Enabled (1)` or `Disabled (0)`.
  - `poolFeeBps`: `10` to `1000` bps (0.1% to 10%).
  - `baseFeeMode`: `DammV2BaseFeeMode.FeeTimeSchedulerLinear (0)`, `FeeTimeSchedulerExponential (1)`, `FeeMarketCapSchedulerLinear (3)`, or `FeeMarketCapSchedulerExponential (4)`.

### 3.5 Liquidity Distribution & Vesting Constraints
- migrated liquidity percentages must add up to **exactly 100%**:
  `partnerLiquidityPercentage + partnerPermanentLockedLiquidityPercentage + partnerVestingLiquidityPercentage + creatorLiquidityPercentage + creatorPermanentLockedLiquidityPercentage + creatorVestingLiquidityPercentage == 100`.
- Minimum locked liquidity requirement: at least **10% (1,000 bps)** of migrated liquidity must still be locked at Day 1 (`MIN_LOCKED_LIQUIDITY_BPS`).
- Maximum vesting lock duration: 2 years (`MAX_LOCK_DURATION_IN_SECONDS = 63_072_000`).

## 4. Pool Creation, Swapping, and Reading State

### 4.1 Pool Address Derivation
```typescript
const poolAddress = deriveDbcPoolAddress(quoteMint, baseMint, configAddress);
```

### 4.2 Pool Creation & First Buy
```typescript
const createPoolTx = await client.creator.createPool({
  baseMint: baseMint.publicKey,
  config: config.publicKey,
  name: "TOKEN_NAME",
  symbol: "TOKEN_SYMBOL",
  uri: "TOKEN_METADATA_URI",
  payer: creator.publicKey,
  poolCreator: creator.publicKey,
});
```

### 4.3 Swap Quoting & Execution
```typescript
const quote = client.pool.swapQuote2({
  virtualPool: poolState,
  config: configState,
  swapBaseForQuote: false,
  swapMode: SwapMode.ExactIn, // or PartialFill, ExactOut
  amountIn: new BN(amountInLamports),
  slippageBps: 100,
  hasReferral: false,
  eligibleForFirstSwapWithMinFee: false,
  currentPoint,
});

const swapTx = await client.pool.swap2({
  owner: userWallet,
  payer: feePayer,
  pool: poolAddress,
  swapBaseForQuote: false,
  swapMode: SwapMode.ExactIn,
  amountIn: new BN(amountInLamports),
  minimumAmountOut: quote.minimumAmountOut,
  referralTokenAccount: null,
});
```

### 4.4 Migration Execution
```typescript
const { transaction: migrateTx } = await client.migration.migrateToDammV2({
  payer: migratorPublicKey,
  pool: poolAddress,
  dammConfig: dammConfigPublicKey,
});
```

## 5. Mainnet Migration Keepers
Meteora operates automatic migration keepers on mainnet (`Asi5DTGE...`, `DeQ8dPv6...`):
- Wrapped SOL: Graduation threshold 10 SOL.
- USDC: Graduation threshold 750 USDC.
- Stock Token quote pairs: Threshold >= 750 USD equivalent.
- Jupiter verified tokens with organic score > 50 and notional value > 750 USD.
- Manual/Devnet migration: Via `client.migration.migrateToDammV2` or Meteora manual migrator.

## 6. Known Gotchas & Critical SDK Findings
1. **Leftover Buffer Requirement (`leftOverDelta must be less than totalLeftover`)**:
   - In `buildCurveWithCustomSqrtPrices` and related curve builders, the SDK adds a 25% swap buffer (`SWAP_BUFFER_PERCENTAGE = 25`) and recalculates `totalDynamicSupply`. If integer rounding causes `totalDynamicSupply > totalSupply`, `leftover` cannot be `0`. A minimum buffer (e.g. `leftover: 1_000` base tokens) is strictly required to prevent runtime exceptions.
2. **`RateLimiter` Deprecation**:
   - `BaseFeeMode.RateLimiter` is deprecated by Meteora and rejected for new configs and new pools. Standard pools must use `BaseFeeMode.FeeSchedulerLinear` or `BaseFeeMode.FeeSchedulerExponential`. A fixed-fee curve is implemented as a linear fee scheduler with `startingFeeBps == endingFeeBps` and `numberOfPeriod == 0`.
3. **DAMM v1 Deprecation**:
   - `MigrationOption.MET_DAMM` (v1) is deprecated and rejected by DBC program for new configs. All new configs and pools must graduate into `MigrationOption.MET_DAMM_V2`.
4. **Node.js 24 DNS Resolution on Windows**:
   - Solana RPC connections require `--dns-result-order=ipv4first` in Node.js 24 environments to prevent IPv6 fetch timeouts against `api.devnet.solana.com`.

## 7. Devnet Experiment Status & Wallet
- Script: `scripts/devnet-hello-pool.ts` (complete, tested).
- Generated devnet test wallet: `BBKXwg9VS8JDRaQCqUk7ByeCUou6vWAZYRYK2PRC9xek`.
- Public devnet faucet status: Currently rate-limited (HTTP 429). Awaiting 1-2 devnet SOL or Helius devnet RPC to commit the live on-chain transaction signature.

