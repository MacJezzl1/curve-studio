import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import {
  DynamicBondingCurveClient,
  buildCurveWithCustomSqrtPrices,
  deriveDbcPoolAddress,
  ActivationType,
  BaseFeeMode as MeteoraBaseFeeMode,
  CollectFeeMode as MeteoraCollectFeeMode,
  MigrationOption as MeteoraMigrationOption,
  MigrationFeeOption as MeteoraMigrationFeeOption,
  MigratedCollectFeeMode as MeteoraMigratedCollectFeeMode,
  DammV2DynamicFeeMode as MeteoraDammV2DynamicFeeMode,
  DammV2BaseFeeMode as MeteoraDammV2BaseFeeMode,
  TokenDecimal,
  TokenType as MeteoraTokenType,
  TokenAuthorityOption as MeteoraTokenAuthorityOption,
  SwapMode,
  SwapQuote2Result,
  VirtualPool,
  PoolConfig,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { DBCConfig, TokenType, TokenAuthorityOption } from "@curve-studio/core";

export interface CreateConfigTxResult {
  transaction: Transaction;
  configKeypair: Keypair;
  configAddress: PublicKey;
}

export interface CreatePoolTxResult {
  transaction: Transaction;
  baseMintKeypair: Keypair;
  poolAddress: PublicKey;
}

export interface SwapTxResult {
  transaction: Transaction;
  quote: SwapQuote2Result;
}

export interface MigrateTxResult {
  transaction: Transaction;
  firstPositionNftKeypair?: Keypair;
  secondPositionNftKeypair?: Keypair;
}

export class DbcAdapter {
  private client: DynamicBondingCurveClient;
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.client = DynamicBondingCurveClient.create(connection, "confirmed");
  }

  public getClient(): DynamicBondingCurveClient {
    return this.client;
  }

  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Derive DBC virtual pool address given quote mint, base mint, and config address.
   */
  public derivePoolAddress(
    quoteMint: PublicKey,
    baseMint: PublicKey,
    configAddress: PublicKey
  ): PublicKey {
    return deriveDbcPoolAddress(quoteMint, baseMint, configAddress);
  }

  /**
   * Builds an unsigned transaction to create an on-chain DBC config account.
   */
  public async buildCreateConfigTx(
    config: DBCConfig,
    params: {
      payer: PublicKey;
      feeClaimer?: PublicKey;
      leftoverReceiver?: PublicKey;
      quoteMint?: PublicKey;
      configKeypair?: Keypair;
    }
  ): Promise<CreateConfigTxResult> {
    const configKeypair = params.configKeypair || Keypair.generate();
    const feeClaimer = params.feeClaimer || params.payer;
    const leftoverReceiver = params.leftoverReceiver || params.payer;
    const quoteMint = params.quoteMint || NATIVE_MINT;

    // Map core token decimals to SDK TokenDecimal enum
    const tokenBaseDecimal =
      config.token.baseDecimals === 6
        ? TokenDecimal.SIX
        : config.token.baseDecimals === 7
        ? TokenDecimal.SEVEN
        : config.token.baseDecimals === 8
        ? TokenDecimal.EIGHT
        : TokenDecimal.NINE;

    const tokenQuoteDecimal =
      config.token.quoteDecimals === 6 ? TokenDecimal.SIX : TokenDecimal.NINE;

    const sqrtPrices = config.points.map((p) => p.sqrtPrice);
    // liquidityWeights: 1 for each segment
    const liquidityWeights = config.segments.map(() => 1);

    const curveConfig = buildCurveWithCustomSqrtPrices({
      token: {
        tokenType:
          config.token.tokenType === TokenType.Token2022
            ? MeteoraTokenType.Token2022
            : MeteoraTokenType.SPLToken,
        tokenBaseDecimal,
        tokenQuoteDecimal,
        tokenAuthorityOption:
          config.token.tokenAuthorityOption === TokenAuthorityOption.CreatorUpdateAuthority
            ? MeteoraTokenAuthorityOption.CreatorUpdateAuthority
            : config.token.tokenAuthorityOption === TokenAuthorityOption.PartnerUpdateAuthority
            ? MeteoraTokenAuthorityOption.PartnerUpdateAuthority
            : MeteoraTokenAuthorityOption.Immutable,
        totalTokenSupply: Number(config.token.totalTokenSupply) / Math.pow(10, config.token.baseDecimals),
        leftover: Number(config.token.leftover) || 1000,
      },
      fee: {
        baseFeeParams: {
          baseFeeMode:
            config.fee.baseFeeMode === 1
              ? MeteoraBaseFeeMode.FeeSchedulerExponential
              : MeteoraBaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: config.fee.feeSchedulerParam.startingFeeBps,
            endingFeeBps: config.fee.feeSchedulerParam.endingFeeBps,
            numberOfPeriod: config.fee.feeSchedulerParam.numberOfPeriod,
            totalDuration: config.fee.feeSchedulerParam.totalDuration,
          },
        },
        dynamicFeeEnabled: config.fee.dynamicFeeEnabled,
        collectFeeMode: MeteoraCollectFeeMode.QuoteToken,
        creatorTradingFeePercentage: config.fee.creatorTradingFeePercentage,
        poolCreationFee: Number(config.fee.poolCreationFee) / 1e9,
        enableFirstSwapWithMinFee: config.fee.enableFirstSwapWithMinFee,
      },
      migration: {
        migrationOption: MeteoraMigrationOption.MET_DAMM_V2,
        migrationFeeOption: MeteoraMigrationFeeOption.Customizable,
        migrationFee: {
          feePercentage: config.migration.feePercentage,
          creatorFeePercentage: config.migration.creatorFeePercentage,
        },
        migratedPoolFee: {
          collectFeeMode: MeteoraMigratedCollectFeeMode.QuoteToken,
          dynamicFee:
            config.migration.migratedPoolFee.dynamicFee === 1
              ? MeteoraDammV2DynamicFeeMode.Enabled
              : MeteoraDammV2DynamicFeeMode.Disabled,
          poolFeeBps: config.migration.migratedPoolFee.poolFeeBps,
          baseFeeMode: MeteoraDammV2BaseFeeMode.FeeTimeSchedulerLinear,
        },
      },
      liquidityDistribution: {
        partnerLiquidityPercentage: config.liquidityDistribution.partnerLiquidityPercentage,
        partnerPermanentLockedLiquidityPercentage:
          config.liquidityDistribution.partnerPermanentLockedLiquidityPercentage,
        creatorLiquidityPercentage: config.liquidityDistribution.creatorLiquidityPercentage,
        creatorPermanentLockedLiquidityPercentage:
          config.liquidityDistribution.creatorPermanentLockedLiquidityPercentage,
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
      liquidityWeights,
    });

    const createConfigTx = await this.client.partner.createConfig({
      config: configKeypair.publicKey,
      feeClaimer,
      leftoverReceiver,
      payer: params.payer,
      quoteMint,
      ...curveConfig,
    });

    createConfigTx.feePayer = params.payer;

    return {
      transaction: createConfigTx,
      configKeypair,
      configAddress: configKeypair.publicKey,
    };
  }

  /**
   * Builds an unsigned transaction to create a DBC virtual pool from an existing config.
   */
  public async buildCreatePoolTx(params: {
    configAddress: PublicKey;
    payer: PublicKey;
    poolCreator?: PublicKey;
    name: string;
    symbol: string;
    uri: string;
    baseMintKeypair?: Keypair;
    quoteMint?: PublicKey;
  }): Promise<CreatePoolTxResult> {
    const baseMintKeypair = params.baseMintKeypair || Keypair.generate();
    const poolCreator = params.poolCreator || params.payer;
    const quoteMint = params.quoteMint || NATIVE_MINT;

    const createPoolTx = await this.client.creator.createPool({
      baseMint: baseMintKeypair.publicKey,
      config: params.configAddress,
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
      payer: params.payer,
      poolCreator,
    });

    createPoolTx.feePayer = params.payer;
    const poolAddress = deriveDbcPoolAddress(
      quoteMint,
      baseMintKeypair.publicKey,
      params.configAddress
    );

    return {
      transaction: createPoolTx,
      baseMintKeypair,
      poolAddress,
    };
  }

  /**
   * Builds an unsigned swap transaction (ExactIn, PartialFill, or ExactOut) with quote.
   */
  public async buildSwapTx(params: {
    poolAddress: PublicKey;
    owner: PublicKey;
    payer?: PublicKey;
    swapBaseForQuote: boolean;
    amountIn: BN;
    slippageBps?: number;
  }): Promise<SwapTxResult> {
    const payer = params.payer || params.owner;
    const slippageBps = params.slippageBps ?? 100;

    const poolState = await this.client.state.getPool(params.poolAddress);
    if (!poolState) {
      throw new Error(`DBC pool not found: ${params.poolAddress.toBase58()}`);
    }

    const configState = await this.client.state.getPoolConfig(poolState.poolState.config);
    if (!configState) {
      throw new Error(`DBC pool config not found for pool: ${params.poolAddress.toBase58()}`);
    }

    const currentPoint =
      configState.activationType === ActivationType.Slot
        ? new BN(await this.connection.getSlot())
        : new BN(Math.floor(Date.now() / 1000));

    const quote = this.client.pool.swapQuote2({
      virtualPool: poolState,
      config: configState,
      swapBaseForQuote: params.swapBaseForQuote,
      swapMode: SwapMode.ExactIn,
      amountIn: params.amountIn,
      slippageBps,
      hasReferral: false,
      eligibleForFirstSwapWithMinFee: false,
      currentPoint,
    });

    const minimumAmountOut = quote.minimumAmountOut ?? quote.outputAmount;

    const swapTx = await this.client.pool.swap2({
      owner: params.owner,
      payer,
      pool: params.poolAddress,
      swapBaseForQuote: params.swapBaseForQuote,
      swapMode: SwapMode.ExactIn,
      amountIn: params.amountIn,
      minimumAmountOut,
      referralTokenAccount: null,
    });

    swapTx.feePayer = payer;

    return {
      transaction: swapTx,
      quote,
    };
  }

  /**
   * Fetch on-chain state of a DBC virtual pool.
   */
  public async getPoolState(poolAddress: PublicKey): Promise<VirtualPool | null> {
    return this.client.state.getPool(poolAddress);
  }

  /**
   * Fetch on-chain state of a DBC pool config.
   */
  public async getPoolConfig(configAddress: PublicKey): Promise<PoolConfig | null> {
    return this.client.state.getPoolConfig(configAddress);
  }

  /**
   * Read curve progress percentages and graduation readiness.
   */
  public async getPoolProgress(poolAddress: PublicKey): Promise<{
    quoteProgressPercent: number;
    baseProgressPercent: number;
    isGraduated: boolean;
  }> {
    const quoteProgress = await this.client.state.getPoolQuoteTokenCurveProgress(poolAddress);
    const baseProgress = await this.client.state.getPoolBaseTokenCurveProgress(poolAddress);
    return {
      quoteProgressPercent: quoteProgress * 100,
      baseProgressPercent: baseProgress * 100,
      isGraduated: quoteProgress >= 1.0,
    };
  }

  /**
   * Read trading fee metrics for a virtual pool.
   */
  public async getPoolFeeMetrics(poolAddress: PublicKey) {
    return this.client.state.getPoolFeeMetrics(poolAddress);
  }

  /**
   * Builds an unsigned transaction to claim accumulated trading fees.
   */
  public async buildClaimFeesTx(params: {
    poolAddress: PublicKey;
    role: "creator" | "partner";
    payer: PublicKey;
    receiver: PublicKey;
    maxBaseAmount?: BN;
    maxQuoteAmount?: BN;
  }): Promise<{ transaction: Transaction }> {
    const maxBase = params.maxBaseAmount || new BN("18446744073709551615");
    const maxQuote = params.maxQuoteAmount || new BN("18446744073709551615");

    let tx: Transaction;
    if (params.role === "creator") {
      tx = await this.client.creator.claimCreatorTradingFeeToReceiver({
        creator: params.payer,
        payer: params.payer,
        pool: params.poolAddress,
        maxBaseAmount: maxBase,
        maxQuoteAmount: maxQuote,
        receiver: params.receiver,
      });
    } else {
      tx = await this.client.partner.claimPartnerTradingFeeToReceiver({
        feeClaimer: params.payer,
        payer: params.payer,
        pool: params.poolAddress,
        maxBaseAmount: maxBase,
        maxQuoteAmount: maxQuote,
        receiver: params.receiver,
      });
    }

    tx.feePayer = params.payer;
    return { transaction: tx };
  }

  /**
   * Helper to build claim creator trading fees transaction.
   */
  public async buildClaimCreatorTradingFeeTx(params: {
    poolAddress: PublicKey;
    feeClaimer: PublicKey;
    payer: PublicKey;
  }): Promise<{ transaction: Transaction }> {
    return this.buildClaimFeesTx({
      poolAddress: params.poolAddress,
      role: "creator",
      payer: params.payer,
      receiver: params.feeClaimer,
    });
  }

  /**
   * Helper to build claim partner trading fees transaction.
   */
  public async buildClaimPartnerTradingFeeTx(params: {
    poolAddress: PublicKey;
    feeClaimer: PublicKey;
    payer: PublicKey;
  }): Promise<{ transaction: Transaction }> {
    return this.buildClaimFeesTx({
      poolAddress: params.poolAddress,
      role: "partner",
      payer: params.payer,
      receiver: params.feeClaimer,
    });
  }

  /**
   * Builds an unsigned transaction to migrate a completed DBC pool to DAMM v2.
   */
  public async buildMigrateToDammV2Tx(params: {
    poolAddress: PublicKey;
    payer: PublicKey;
    dammConfig: PublicKey;
  }): Promise<MigrateTxResult> {
    const res = await this.client.migration.migrateToDammV2({
      payer: params.payer,
      pool: params.poolAddress,
      dammConfig: params.dammConfig,
    });

    res.transaction.feePayer = params.payer;
    return {
      transaction: res.transaction,
      firstPositionNftKeypair: res.firstPositionNftKeypair,
      secondPositionNftKeypair: res.secondPositionNftKeypair,
    };
  }
}
