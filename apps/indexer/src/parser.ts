import { PublicKey } from "@solana/web3.js";
import { IndexedSwap, IndexedPool } from "./types.js";

export const METEORA_DBC_PROGRAM_ID = new PublicKey(
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"
);

export interface ParsedLogEvent {
  type: "create_pool" | "swap" | "claim_fee" | "migrate" | "unknown";
  data: Record<string, any>;
}

/**
 * Parses raw Solana transaction log messages from Meteora DBC program.
 */
export function parseDbcLogMessages(
  signature: string,
  slot: number,
  logs: string[]
): ParsedLogEvent[] {
  const events: ParsedLogEvent[] = [];

  for (let i = 0; i < logs.length; i++) {
    const line = logs[i];

    // Check for swap events
    if (line.includes("Instruction: Swap") || line.includes("evtSwap")) {
      events.push({
        type: "swap",
        data: {
          signature,
          slot,
          timestamp: Date.now(),
          raw: line,
        },
      });
    }

    // Check for pool creation
    if (line.includes("Instruction: InitializePool") || line.includes("evtCreatePool") || line.includes("CreatePool")) {
      events.push({
        type: "create_pool",
        data: {
          signature,
          slot,
          timestamp: Date.now(),
          raw: line,
        },
      });
    }

    // Check for fee claims
    if (line.includes("evtClaimCreatorTradingFee") || line.includes("evtClaimTradingFee") || line.includes("ClaimTradingFee")) {
      events.push({
        type: "claim_fee",
        data: {
          signature,
          slot,
          timestamp: Date.now(),
          raw: line,
        },
      });
    }

    // Check for migrations to DAMM v2
    if (line.includes("evtMigrateToMeteoraDamm") || line.includes("Instruction: Migrate") || line.includes("MigrateToMeteoraDamm")) {
      events.push({
        type: "migrate",
        data: {
          signature,
          slot,
          timestamp: Date.now(),
          raw: line,
        },
      });
    }
  }

  return events;
}
