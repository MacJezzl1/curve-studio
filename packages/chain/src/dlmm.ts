import {
  Connection,
  PublicKey,
} from "@solana/web3.js";
import DLMM from "@meteora-ag/dlmm";

export interface ConvictionPositionParams {
  poolAddress: PublicKey;
  user: PublicKey;
  totalXAmount: number;
  totalYAmount: number;
  minBinId: number;
  maxBinId: number;
}

export class DlmmAdapter {
  private connection: Connection;
  private cluster: "devnet" | "mainnet-beta";

  constructor(connection: Connection, cluster: "devnet" | "mainnet-beta" = "devnet") {
    this.connection = connection;
    this.cluster = cluster;
  }

  /**
   * Initialize a DLMM pool client instance.
   */
  public async getDlmmPool(poolAddress: PublicKey): Promise<DLMM> {
    return DLMM.create(this.connection, poolAddress, {
      cluster: this.cluster,
    });
  }

  /**
   * Fetch active bin and price for a DLMM pool.
   */
  public async getActiveBin(poolAddress: PublicKey) {
    const dlmm = await this.getDlmmPool(poolAddress);
    return dlmm.getActiveBin();
  }

  /**
   * Helper to derive single-sided conviction bin range above current active bin.
   * Single-sided liquidity (Token X only, or Token Y only) enables staking with fee accrual.
   */
  public calculateConvictionBinRange(
    activeBinId: number,
    binCount = 10,
    offsetBins = 1
  ): { minBinId: number; maxBinId: number } {
    const minBinId = activeBinId + offsetBins;
    const maxBinId = minBinId + binCount;
    return { minBinId, maxBinId };
  }
}
