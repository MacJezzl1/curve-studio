import { Transaction, PublicKey } from "@solana/web3.js";

export const KNOWN_PROGRAMS: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "SPL Token Program",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "Token-2022 Program",
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN": "Meteora Dynamic Bonding Curve (DBC)",
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG": "Meteora DAMM v2 (cp-amm)",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo": "Meteora DLMM (lb_clmm)",
  "ComputeBudget111111111111111111111111111111": "Compute Budget Program",
};

export interface DecodedInstructionSummary {
  index: number;
  programId: string;
  programName: string;
  accounts: {
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }[];
  dataHex: string;
}

export interface TransactionPreview {
  feePayer: string;
  instructionsCount: number;
  instructions: DecodedInstructionSummary[];
  programsInvolved: string[];
  allSigners: string[];
  securityWarnings: string[];
}

export class TransactionIntrospector {
  /**
   * Introspect a compiled Transaction object and produce a human-verifiable preview.
   * Derived purely from the built transaction bytes, ensuring user form inputs cannot lie.
   */
  public static introspect(
    tx: Transaction,
    expectedSigner?: PublicKey
  ): TransactionPreview {
    const securityWarnings: string[] = [];
    const feePayer = tx.feePayer ? tx.feePayer.toBase58() : "UNKNOWN";

    if (expectedSigner && tx.feePayer && !tx.feePayer.equals(expectedSigner)) {
      securityWarnings.push(
        `Fee payer (${feePayer}) does not match expected connected wallet (${expectedSigner.toBase58()})`
      );
    }

    const programsInvolvedSet = new Set<string>();
    const signersSet = new Set<string>();

    const instructions: DecodedInstructionSummary[] = tx.instructions.map(
      (ix, index) => {
        const programIdStr = ix.programId.toBase58();
        const programName = KNOWN_PROGRAMS[programIdStr] || "Unknown Program";
        programsInvolvedSet.add(programName);

        if (!KNOWN_PROGRAMS[programIdStr]) {
          securityWarnings.push(
            `Instruction ${index} invokes an unrecognized program: ${programIdStr}`
          );
        }

        const accounts = ix.keys.map((k) => {
          const pkStr = k.pubkey.toBase58();
          if (k.isSigner) signersSet.add(pkStr);
          return {
            pubkey: pkStr,
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          };
        });

        return {
          index,
          programId: programIdStr,
          programName,
          accounts,
          dataHex: ix.data.toString("hex"),
        };
      }
    );

    return {
      feePayer,
      instructionsCount: tx.instructions.length,
      instructions,
      programsInvolved: Array.from(programsInvolvedSet),
      allSigners: Array.from(signersSet),
      securityWarnings,
    };
  }
}
