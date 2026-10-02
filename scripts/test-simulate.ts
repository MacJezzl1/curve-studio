import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
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
} from "@meteora-ag/dynamic-bonding-curve-sdk";

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const client = DynamicBondingCurveClient.create(connection, "confirmed");

  const payer = Keypair.generate();
  const configKeypair = Keypair.generate();

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

  const createConfigTx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer: payer.publicKey,
    leftoverReceiver: payer.publicKey,
    payer: payer.publicKey,
    quoteMint: NATIVE_MINT,
    ...curveConfig,
  });

  createConfigTx.feePayer = payer.publicKey;
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  createConfigTx.recentBlockhash = latestBlockhash.blockhash;
  createConfigTx.partialSign(payer, configKeypair);

  console.log("Simulating createConfigTx against devnet...");
  const simRes = await connection.simulateTransaction(createConfigTx, [payer, configKeypair], false);
  console.log("Simulation Result:", JSON.stringify(simRes.value, null, 2));
}

main().catch(console.error);
