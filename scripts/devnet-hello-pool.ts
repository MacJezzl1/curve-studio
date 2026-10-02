import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import * as fs from "fs";
import * as path from "path";
import {
  DynamicBondingCurveClient,
  buildCurveWithCustomSqrtPrices,
  createSqrtPrices,
  deriveDbcPoolAddress,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationOption,
  MigrationFeeOption,
  MigratedCollectFeeMode,
  DammV2DynamicFeeMode,
  DammV2BaseFeeMode,
  TokenDecimal,
  TokenType,
  TokenAuthorityOption,
  SwapMode,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

const DEVNET_RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const KEYPAIR_PATH = path.resolve(__dirname, "devnet-keypair.json");

function getOrCreateKeypair(): Keypair {
  if (fs.existsSync(KEYPAIR_PATH)) {
    const raw = fs.readFileSync(KEYPAIR_PATH, "utf-8");
    const secret = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(secret);
  }
  const kp = Keypair.generate();
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function requestAirdropWithRetry(connection: Connection, pubkey: PublicKey, attempts = 3): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`Requesting airdrop of 1 SOL (attempt ${i + 1}/${attempts})...`);
      const sig = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction({ signature: sig, ...latestBlockhash }, "confirmed");
      console.log(`Airdrop confirmed! Signature: ${sig}`);
      return;
    } catch (err: any) {
      console.warn(`Airdrop attempt ${i + 1} failed:`, err?.message || err);
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  }
}

async function main() {
  console.log("=== Meteora DBC Devnet Hello Pool Experiment ===");
  console.log(`Connecting to: ${DEVNET_RPC}`);
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const client = DynamicBondingCurveClient.create(connection, "confirmed");

  const payer = getOrCreateKeypair();
  console.log(`Payer Address: ${payer.publicKey.toBase58()}`);

  let balance = await connection.getBalance(payer.publicKey, "confirmed");
  console.log(`Current Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.2 * LAMPORTS_PER_SOL) {
    await requestAirdropWithRetry(connection, payer.publicKey);
    balance = await connection.getBalance(payer.publicKey, "confirmed");
    console.log(`New Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  }

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error(`Insufficient balance (${balance / LAMPORTS_PER_SOL} SOL) to execute on devnet.`);
    console.error(`Please fund the test wallet: ${payer.publicKey.toBase58()}`);
    process.exit(1);
  }

  // 1. Build Curve Config
  console.log("\n1. Building DBC curve configuration...");
  const sqrtPrices = createSqrtPrices(
    [0.000000001, 0.000000002, 0.000001],
    TokenDecimal.SIX,
    TokenDecimal.NINE
  );

  const curveConfig = buildCurveWithCustomSqrtPrices({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: 1_000_000_000,
      leftover: 1_000,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: 100,
          endingFeeBps: 100,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: 0,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: {
        feePercentage: 0,
        creatorFeePercentage: 0,
      },
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        poolFeeBps: 100,
        baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: 0,
      partnerPermanentLockedLiquidityPercentage: 100,
      creatorLiquidityPercentage: 0,
      creatorPermanentLockedLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    sqrtPrices,
    liquidityWeights: [1, 1],
  });

  // 2. Create Config Account
  console.log("2. Creating DBC Config account on devnet...");
  const configKeypair = Keypair.generate();
  console.log(`Config Keypair: ${configKeypair.publicKey.toBase58()}`);

  const createConfigTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: payer.publicKey,
    leftoverReceiver: payer.publicKey,
    payer: payer.publicKey,
    quoteMint: NATIVE_MINT,
    ...curveConfig,
  });

  createConfigTx.feePayer = payer.publicKey;
  const configSig = await sendAndConfirmTransaction(
    connection,
    createConfigTx,
    [payer, configKeypair],
    { commitment: "confirmed" }
  );
  console.log(`Config Created! Tx Signature: ${configSig}`);

  // 3. Create Virtual Pool
  console.log("\n3. Creating DBC Virtual Pool on devnet...");
  const baseMintKeypair = Keypair.generate();
  console.log(`Base Mint Keypair: ${baseMintKeypair.publicKey.toBase58()}`);

  const createPoolTx = await client.creator.createPool({
    baseMint: baseMintKeypair.publicKey,
    config: configKeypair.publicKey,
    name: "CurveStudio Demo",
    symbol: "CSTUDIO",
    uri: "https://raw.githubusercontent.com/solana-developers/brand-assets/main/assets/solanaLogoMark.png",
    payer: payer.publicKey,
    poolCreator: payer.publicKey,
  });

  createPoolTx.feePayer = payer.publicKey;
  const poolSig = await sendAndConfirmTransaction(
    connection,
    createPoolTx,
    [payer, baseMintKeypair],
    { commitment: "confirmed" }
  );
  console.log(`Pool Created! Tx Signature: ${poolSig}`);

  const poolAddress = deriveDbcPoolAddress(
    NATIVE_MINT,
    baseMintKeypair.publicKey,
    configKeypair.publicKey
  );
  console.log(`Derived Virtual Pool Address: ${poolAddress.toBase58()}`);

  // 4. Perform First Swap (Buy)
  console.log("\n4. Performing First Buy (0.01 SOL) against DBC Pool...");
  const poolState = await client.state.getPool(poolAddress);
  if (!poolState) {
    throw new Error(`Failed to fetch pool state for ${poolAddress.toBase58()}`);
  }
  const configState = await client.state.getPoolConfig(configKeypair.publicKey);
  if (!configState) {
    throw new Error(`Failed to fetch config state for ${configKeypair.publicKey.toBase58()}`);
  }

  const currentPoint = new BN(Math.floor(Date.now() / 1000));
  const buyAmountLamports = new BN(0.01 * LAMPORTS_PER_SOL);

  const quote = client.pool.swapQuote2({
    virtualPool: poolState,
    config: configState,
    swapBaseForQuote: false, // buying base with quote
    swapMode: SwapMode.ExactIn,
    amountIn: buyAmountLamports,
    slippageBps: 200,
    hasReferral: false,
    eligibleForFirstSwapWithMinFee: false,
    currentPoint,
  });

  console.log(`Quote: Input 0.01 SOL -> Output ${quote.amountOut.toString()} base tokens (min ${quote.minimumAmountOut.toString()})`);

  const swapTx = await client.pool.swap2({
    owner: payer.publicKey,
    payer: payer.publicKey,
    pool: poolAddress,
    swapBaseForQuote: false,
    swapMode: SwapMode.ExactIn,
    amountIn: buyAmountLamports,
    minimumAmountOut: quote.minimumAmountOut,
    referralTokenAccount: null,
  });

  swapTx.feePayer = payer.publicKey;
  const swapSig = await sendAndConfirmTransaction(
    connection,
    swapTx,
    [payer],
    { commitment: "confirmed" }
  );
  console.log(`First Buy Executed! Tx Signature: ${swapSig}`);

  // 5. Read Pool State After Swap
  console.log("\n5. Reading Pool State After Swap...");
  const quoteProgress = await client.state.getPoolQuoteTokenCurveProgress(poolAddress);
  const baseProgress = await client.state.getPoolBaseTokenCurveProgress(poolAddress);
  const feeMetrics = await client.state.getPoolFeeMetrics(poolAddress);

  console.log("Pool State Summary:", {
    poolAddress: poolAddress.toBase58(),
    baseMint: baseMintKeypair.publicKey.toBase58(),
    config: configKeypair.publicKey.toBase58(),
    quoteProgressPercent: (quoteProgress * 100).toFixed(4) + "%",
    baseProgressPercent: (baseProgress * 100).toFixed(4) + "%",
    totalTradingQuoteFeeLamports: feeMetrics.total.totalTradingQuoteFee.toString(),
  });

  console.log("\nSUCCESS: Phase 0 Hello Pool experiment completed on Devnet!");
}

main().catch((err) => {
  console.error("Experiment failed with error:", err);
  process.exit(1);
});
