import BN from "bn.js";
import {
  DBCConfig,
  CurveFamily,
  TokenType,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigratedCollectFeeMode,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  MigrationOption,
  MigrationFeeOption,
  TokenAuthorityOption,
  FeeConfig,
  MigrationConfig,
  LiquidityDistribution,
  TokenConfig,
} from "./types.js";
import { generateCurve, CurveGenerationParams } from "./curves.js";
import { validateConfig } from "./validator.js";

export class ConfigBuilder {
  private _name = "Custom DBC Curve";
  private _version = "1.0.0";
  private _curveFamily: CurveFamily = CurveFamily.Exponential;
  private _initialPrice = 0.000001;
  private _graduationPrice = 0.00002;
  private _tokenSupply: BN = new BN("1000000000000000"); // 1 billion with 6 decimals (1e15)
  private _baseDecimals = 6;
  private _quoteDecimals = 9;
  private _tokenAuthorityOption: TokenAuthorityOption = TokenAuthorityOption.Immutable;
  private _leftover = "1000";

  // Curve family parameters
  private _segmentsCount = 6;
  private _pivotPrice?: number;
  private _pivotSupplyRatio = 0.75;
  private _tranchesCount = 3;
  private _customPoints?: { price: number; supplyShare: number }[];

  // Fee parameters
  private _baseFeeMode: BaseFeeMode = BaseFeeMode.FeeSchedulerLinear;
  private _startingFeeBps = 100; // 1%
  private _endingFeeBps = 100;
  private _numberOfPeriod = 0;
  private _totalDuration = 0;
  private _dynamicFeeEnabled = false;
  private _collectFeeMode: CollectFeeMode = CollectFeeMode.QuoteToken;
  private _creatorTradingFeePercentage = 0;
  private _poolCreationFee = "0";
  private _enableFirstSwapWithMinFee = false;

  // Migration parameters
  private _migrationOption: MigrationOption = MigrationOption.MET_DAMM_V2;
  private _migrationFeeOption: MigrationFeeOption = MigrationFeeOption.Customizable;
  private _migrationFeePercentage = 0;
  private _creatorMigrationFeePercentage = 0;
  private _migratedCollectFeeMode: MigratedCollectFeeMode = MigratedCollectFeeMode.QuoteToken;
  private _migratedDynamicFee: DammV2DynamicFeeMode = DammV2DynamicFeeMode.Disabled;
  private _migratedPoolFeeBps = 100; // 1%
  private _migratedBaseFeeMode: DammV2BaseFeeMode = DammV2BaseFeeMode.FeeTimeSchedulerLinear;
  private _migratedCompoundingFeeBps = 0;

  // Liquidity distribution
  private _partnerPermanentLockedLiquidityPercentage = 100;
  private _partnerLiquidityPercentage = 0;
  private _partnerVestingLiquidityPercentage = 0;
  private _creatorLiquidityPercentage = 0;
  private _creatorPermanentLockedLiquidityPercentage = 0;
  private _creatorVestingLiquidityPercentage = 0;

  // Activation
  private _activationType: ActivationType = ActivationType.Timestamp;

  public static create(name = "Custom DBC Curve"): ConfigBuilder {
    const builder = new ConfigBuilder();
    builder._name = name;
    return builder;
  }

  public setName(name: string): this {
    this._name = name;
    return this;
  }

  public setCurveFamily(family: CurveFamily): this {
    this._curveFamily = family;
    return this;
  }

  public setPriceRange(initialPrice: number, graduationPrice: number): this {
    this._initialPrice = initialPrice;
    this._graduationPrice = graduationPrice;
    return this;
  }

  public setTokenSupply(supply: BN | string | number, decimals = 6): this {
    this._baseDecimals = decimals;
    if (supply instanceof BN) {
      this._tokenSupply = supply;
    } else {
      this._tokenSupply = new BN(supply.toString());
    }
    return this;
  }

  public setDecimals(baseDecimals: number, quoteDecimals = 9): this {
    this._baseDecimals = baseDecimals;
    this._quoteDecimals = quoteDecimals;
    return this;
  }

  public setSegmentsCount(count: number): this {
    this._segmentsCount = count;
    return this;
  }

  public setLongTailParams(pivotPrice: number, pivotSupplyRatio = 0.75): this {
    this._pivotPrice = pivotPrice;
    this._pivotSupplyRatio = pivotSupplyRatio;
    return this;
  }

  public setSteppedParams(tranchesCount: number): this {
    this._tranchesCount = tranchesCount;
    return this;
  }

  public setCustomPoints(points: { price: number; supplyShare: number }[]): this {
    this._customPoints = points;
    return this;
  }

  public setFeeSchedule(startingBps: number, endingBps = startingBps, duration = 0, periods = 0): this {
    this._startingFeeBps = startingBps;
    this._endingFeeBps = endingBps;
    this._totalDuration = duration;
    this._numberOfPeriod = periods;
    this._baseFeeMode =
      duration > 0 ? BaseFeeMode.FeeSchedulerLinear : BaseFeeMode.FeeSchedulerLinear;
    return this;
  }

  public setFeeSchedulerExponential(startingBps: number, endingBps: number, duration: number, periods: number): this {
    this._startingFeeBps = startingBps;
    this._endingFeeBps = endingBps;
    this._totalDuration = duration;
    this._numberOfPeriod = periods;
    this._baseFeeMode = BaseFeeMode.FeeSchedulerExponential;
    return this;
  }

  public setCreatorTradingFeePercentage(pct: number): this {
    this._creatorTradingFeePercentage = pct;
    return this;
  }

  public setPoolCreationFee(feeLamports: string | number | BN): this {
    this._poolCreationFee = feeLamports.toString();
    return this;
  }

  public setMigrationFee(feePercentage: number, creatorSharePercentage = 0): this {
    this._migrationFeePercentage = feePercentage;
    this._creatorMigrationFeePercentage = creatorSharePercentage;
    return this;
  }

  public setMigratedPoolFee(
    poolFeeBps: number,
    collectFeeMode = MigratedCollectFeeMode.QuoteToken,
    dynamicFee = DammV2DynamicFeeMode.Disabled,
    baseFeeMode = DammV2BaseFeeMode.FeeTimeSchedulerLinear
  ): this {
    this._migratedPoolFeeBps = poolFeeBps;
    this._migratedCollectFeeMode = collectFeeMode;
    this._migratedDynamicFee = dynamicFee;
    this._migratedBaseFeeMode = baseFeeMode;
    return this;
  }

  public setLiquidityDistribution(dist: Partial<LiquidityDistribution>): this {
    if (dist.partnerPermanentLockedLiquidityPercentage !== undefined) {
      this._partnerPermanentLockedLiquidityPercentage = dist.partnerPermanentLockedLiquidityPercentage;
    }
    if (dist.partnerLiquidityPercentage !== undefined) {
      this._partnerLiquidityPercentage = dist.partnerLiquidityPercentage;
    }
    if (dist.partnerVestingLiquidityPercentage !== undefined) {
      this._partnerVestingLiquidityPercentage = dist.partnerVestingLiquidityPercentage;
    }
    if (dist.creatorPermanentLockedLiquidityPercentage !== undefined) {
      this._creatorPermanentLockedLiquidityPercentage = dist.creatorPermanentLockedLiquidityPercentage;
    }
    if (dist.creatorLiquidityPercentage !== undefined) {
      this._creatorLiquidityPercentage = dist.creatorLiquidityPercentage;
    }
    if (dist.creatorVestingLiquidityPercentage !== undefined) {
      this._creatorVestingLiquidityPercentage = dist.creatorVestingLiquidityPercentage;
    }
    return this;
  }

  public setLeftover(bufferUnits: string | number): this {
    this._leftover = bufferUnits.toString();
    return this;
  }

  public build(): DBCConfig {
    const curveGenParams: CurveGenerationParams = {
      family: this._curveFamily,
      initialPrice: this._initialPrice,
      graduationPrice: this._graduationPrice,
      tokenSupply: this._tokenSupply,
      baseDecimals: this._baseDecimals,
      quoteDecimals: this._quoteDecimals,
      segmentsCount: this._segmentsCount,
      pivotPrice: this._pivotPrice,
      pivotSupplyRatio: this._pivotSupplyRatio,
      tranchesCount: this._tranchesCount,
      customPoints: this._customPoints,
    };

    const { points, segments, migrationQuoteThreshold } = generateCurve(curveGenParams);

    const token: TokenConfig = {
      tokenType: TokenType.SPLToken,
      baseDecimals: this._baseDecimals,
      quoteDecimals: this._quoteDecimals,
      tokenAuthorityOption: this._tokenAuthorityOption,
      totalTokenSupply: this._tokenSupply.toString(),
      leftover: this._leftover,
    };

    const fee: FeeConfig = {
      baseFeeMode: this._baseFeeMode,
      feeSchedulerParam: {
        startingFeeBps: this._startingFeeBps,
        endingFeeBps: this._endingFeeBps,
        numberOfPeriod: this._numberOfPeriod,
        totalDuration: this._totalDuration,
      },
      dynamicFeeEnabled: this._dynamicFeeEnabled,
      collectFeeMode: this._collectFeeMode,
      creatorTradingFeePercentage: this._creatorTradingFeePercentage,
      poolCreationFee: this._poolCreationFee,
      enableFirstSwapWithMinFee: this._enableFirstSwapWithMinFee,
    };

    const migration: MigrationConfig = {
      migrationOption: this._migrationOption,
      migrationFeeOption: this._migrationFeeOption,
      feePercentage: this._migrationFeePercentage,
      creatorFeePercentage: this._creatorMigrationFeePercentage,
      migratedPoolFee: {
        collectFeeMode: this._migratedCollectFeeMode,
        dynamicFee: this._migratedDynamicFee,
        poolFeeBps: this._migratedPoolFeeBps,
        baseFeeMode: this._migratedBaseFeeMode,
        compoundingFeeBps: this._migratedCompoundingFeeBps,
      },
    };

    const liquidityDistribution: LiquidityDistribution = {
      partnerPermanentLockedLiquidityPercentage: this._partnerPermanentLockedLiquidityPercentage,
      partnerLiquidityPercentage: this._partnerLiquidityPercentage,
      partnerVestingLiquidityPercentage: this._partnerVestingLiquidityPercentage,
      creatorPermanentLockedLiquidityPercentage: this._creatorPermanentLockedLiquidityPercentage,
      creatorLiquidityPercentage: this._creatorLiquidityPercentage,
      creatorVestingLiquidityPercentage: this._creatorVestingLiquidityPercentage,
    };

    const config: DBCConfig = {
      version: this._version,
      name: this._name,
      curveFamily: this._curveFamily,
      token,
      fee,
      migration,
      liquidityDistribution,
      activationType: this._activationType,
      points,
      segments,
      migrationQuoteThreshold,
      initialPrice: this._initialPrice,
      migrationPrice: this._graduationPrice,
      creatorTradingFeePercentage: this._creatorTradingFeePercentage,
    };

    return config;
  }

  public buildAndValidate() {
    const config = this.build();
    const validation = validateConfig(config);
    return { config, validation };
  }
}

export interface BondingCurveBuildParams {
  name?: string;
  family?: CurveFamily;
  token: {
    tokenType: TokenType;
    baseDecimals: number;
    quoteDecimals: number;
    tokenAuthorityOption: TokenAuthorityOption;
    totalTokenSupply: BN;
    leftover?: BN;
  };
  curve: {
    startPrice: number;
    migrationPrice: number;
    migrationTargetPercentage?: number;
    numSegments?: number;
    steepnessExponent?: number;
  };
  fee: {
    baseFeeMode: BaseFeeMode;
    startingFeeBps: number;
    endingFeeBps: number;
    numberOfPeriod?: number;
    totalDuration?: number;
    dynamicFeeEnabled?: boolean;
    collectFeeMode?: CollectFeeMode;
    creatorTradingFeePercentage?: number;
    poolCreationFee?: BN;
    enableFirstSwapWithMinFee?: boolean;
  };
  migration: {
    migrationOption: MigrationOption;
    migrationFeeOption: MigrationFeeOption;
    feePercentage?: number;
    creatorFeePercentage?: number;
    migratedPoolFee: {
      collectFeeMode?: MigratedCollectFeeMode;
      dynamicFee?: DammV2DynamicFeeMode;
      poolFeeBps: number;
      baseFeeMode?: DammV2BaseFeeMode;
      compoundingFeeBps?: number;
    };
  };
  liquidityDistribution: {
    partnerLiquidityPercentage?: number;
    partnerPermanentLockedLiquidityPercentage?: number;
    partnerVestingLiquidityPercentage?: number;
    creatorLiquidityPercentage?: number;
    creatorPermanentLockedLiquidityPercentage?: number;
    creatorVestingLiquidityPercentage?: number;
  };
  activationType?: ActivationType;
}

export function buildBondingCurve(params: BondingCurveBuildParams): DBCConfig {
  const curveGenParams: CurveGenerationParams = {
    family: params.family ?? CurveFamily.Exponential,
    initialPrice: params.curve.startPrice,
    graduationPrice: params.curve.migrationPrice,
    tokenSupply: params.token.totalTokenSupply,
    baseDecimals: params.token.baseDecimals,
    quoteDecimals: params.token.quoteDecimals,
    segmentsCount: params.curve.numSegments ?? 2,
  };

  const { points, segments, migrationQuoteThreshold } = generateCurve(curveGenParams);

  const token: TokenConfig = {
    tokenType: params.token.tokenType,
    baseDecimals: params.token.baseDecimals,
    quoteDecimals: params.token.quoteDecimals,
    tokenAuthorityOption: params.token.tokenAuthorityOption,
    totalTokenSupply: params.token.totalTokenSupply.toString(),
    leftover: (params.token.leftover ?? new BN(1000)).toString(),
  };

  const fee: FeeConfig = {
    baseFeeMode: params.fee.baseFeeMode,
    feeSchedulerParam: {
      startingFeeBps: params.fee.startingFeeBps,
      endingFeeBps: params.fee.endingFeeBps,
      numberOfPeriod: params.fee.numberOfPeriod ?? 0,
      totalDuration: params.fee.totalDuration ?? 0,
    },
    dynamicFeeEnabled: params.fee.dynamicFeeEnabled ?? false,
    collectFeeMode: params.fee.collectFeeMode ?? CollectFeeMode.QuoteToken,
    creatorTradingFeePercentage: params.fee.creatorTradingFeePercentage ?? 0,
    poolCreationFee: (params.fee.poolCreationFee ?? new BN(0)).toString(),
    enableFirstSwapWithMinFee: params.fee.enableFirstSwapWithMinFee ?? false,
  };

  const migration: MigrationConfig = {
    migrationOption: params.migration.migrationOption,
    migrationFeeOption: params.migration.migrationFeeOption,
    feePercentage: params.migration.feePercentage ?? 0,
    creatorFeePercentage: params.migration.creatorFeePercentage ?? 0,
    migratedPoolFee: {
      collectFeeMode: params.migration.migratedPoolFee.collectFeeMode ?? MigratedCollectFeeMode.QuoteToken,
      dynamicFee: params.migration.migratedPoolFee.dynamicFee ?? DammV2DynamicFeeMode.Disabled,
      poolFeeBps: params.migration.migratedPoolFee.poolFeeBps,
      baseFeeMode: params.migration.migratedPoolFee.baseFeeMode ?? DammV2BaseFeeMode.FeeTimeSchedulerLinear,
      compoundingFeeBps: params.migration.migratedPoolFee.compoundingFeeBps ?? 0,
    },
  };

  const liquidityDistribution: LiquidityDistribution = {
    partnerPermanentLockedLiquidityPercentage:
      params.liquidityDistribution.partnerPermanentLockedLiquidityPercentage ?? 100,
    partnerLiquidityPercentage: params.liquidityDistribution.partnerLiquidityPercentage ?? 0,
    partnerVestingLiquidityPercentage:
      params.liquidityDistribution.partnerVestingLiquidityPercentage ?? 0,
    creatorPermanentLockedLiquidityPercentage:
      params.liquidityDistribution.creatorPermanentLockedLiquidityPercentage ?? 0,
    creatorLiquidityPercentage: params.liquidityDistribution.creatorLiquidityPercentage ?? 0,
    creatorVestingLiquidityPercentage:
      params.liquidityDistribution.creatorVestingLiquidityPercentage ?? 0,
  };

  return {
    version: "1.0.0",
    name: params.name ?? "Bonding Curve",
    curveFamily: params.family ?? CurveFamily.Exponential,
    token,
    fee,
    migration,
    liquidityDistribution,
    activationType: params.activationType ?? ActivationType.Timestamp,
    points,
    segments,
    migrationQuoteThreshold,
    initialPrice: params.curve.startPrice,
    migrationPrice: params.curve.migrationPrice,
    creatorTradingFeePercentage: params.fee.creatorTradingFeePercentage ?? 0,
  };
}

