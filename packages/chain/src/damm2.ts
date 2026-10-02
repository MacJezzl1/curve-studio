import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { CpAmm, PoolState } from "@meteora-ag/cp-amm-sdk";

export class Damm2Adapter {
  private connection: Connection;
  private cpAmm: CpAmm;

  constructor(connection: Connection) {
    this.connection = connection;
    this.cpAmm = new CpAmm(connection);
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getCpAmm(): CpAmm {
    return this.cpAmm;
  }

  /**
   * Fetch on-chain state of a DAMM v2 pool.
   */
  public async fetchPoolState(poolAddress: PublicKey): Promise<PoolState | null> {
    try {
      return await this.cpAmm.fetchPoolState(poolAddress);
    } catch {
      return null;
    }
  }

  /**
   * Builds a swap transaction against a graduated DAMM v2 pool.
   */
  public async buildSwapTx(params: {
    poolAddress: PublicKey;
    owner: PublicKey;
    inputTokenMint: PublicKey;
    amountIn: BN;
    minAmountOut: BN;
  }): Promise<{ transaction: Transaction }> {
    const poolState = await this.cpAmm.fetchPoolState(params.poolAddress);
    if (!poolState) {
      throw new Error(`DAMM v2 pool not found: ${params.poolAddress.toBase58()}`);
    }

    const isTokenAInput = poolState.tokenAMint.equals(params.inputTokenMint);
    const outputTokenMint = isTokenAInput ? poolState.tokenBMint : poolState.tokenAMint;

    const tokenAInfo = await this.connection.getAccountInfo(poolState.tokenAMint);
    const tokenBInfo = await this.connection.getAccountInfo(poolState.tokenBMint);
    const tokenAProgram = tokenAInfo?.owner ?? new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const tokenBProgram = tokenBInfo?.owner ?? new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    const swapTx = await this.cpAmm.swap({
      pool: params.poolAddress,
      payer: params.owner,
      inputTokenMint: params.inputTokenMint,
      outputTokenMint,
      amountIn: params.amountIn,
      minimumAmountOut: params.minAmountOut,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram,
      tokenBProgram,
      referralTokenAccount: null,
      poolState,
    });

    swapTx.feePayer = params.owner;
    return { transaction: swapTx };
  }

  /**
   * Fetch user positions (NFT-backed LP positions) in a DAMM v2 pool.
   */
  public async fetchUserPositions(owner: PublicKey) {
    return this.cpAmm.getPositionsByUser(owner);
  }
}

