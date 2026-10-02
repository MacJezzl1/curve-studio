export interface IndexedPool {
  poolAddress: string;
  configAddress: string;
  baseMint: string;
  quoteMint: string;
  name: string;
  symbol: string;
  uri: string;
  creator: string;
  createdAt: number;
  updatedAt: number;
  isMigrated: boolean;
  dammPoolAddress?: string;
  virtualBaseReserve: string;
  virtualQuoteReserve: string;
  realQuoteReserve: string;
  targetQuoteReserve: string;
  migrationProgressPercentage: number;
  totalVolumeQuote: string;
  totalSwaps: number;
  creatorTradingFeesCollected: string;
  partnerTradingFeesCollected: string;
}

export interface IndexedSwap {
  id: string;
  poolAddress: string;
  signature: string;
  slot: number;
  timestamp: number;
  user: string;
  direction: "buy" | "sell";
  amountIn: string;
  amountOut: string;
  feeAmount: string;
  price: number;
}

export interface IndexedMigration {
  poolAddress: string;
  dammPoolAddress: string;
  signature: string;
  slot: number;
  timestamp: number;
  migratedQuoteAmount: string;
  migratedBaseAmount: string;
}

export interface IndexerStats {
  totalPools: number;
  migratedPools: number;
  activePools: number;
  totalVolumeSol: number;
  totalSwaps: number;
  lastIndexedSlot: number;
  uptimeSeconds: number;
}
