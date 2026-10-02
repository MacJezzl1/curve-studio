import { describe, it, expect } from "vitest";
import {
  Transaction,
  SystemProgram,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { TransactionIntrospector } from "../src/introspection.js";

describe("Transaction Introspector & Security Verifier", () => {
  const alice = Keypair.generate();
  const bob = Keypair.generate();

  it("decodes a standard SOL transfer instruction correctly", () => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: alice.publicKey,
        toPubkey: bob.publicKey,
        lamports: 1_000_000,
      })
    );
    tx.feePayer = alice.publicKey;

    const preview = TransactionIntrospector.introspect(tx, alice.publicKey);
    expect(preview.instructionsCount).toBe(1);
    expect(preview.feePayer).toBe(alice.publicKey.toBase58());
    expect(preview.programsInvolved).toContain("System Program");
    expect(preview.securityWarnings.length).toBe(0);
  });

  it("warns if fee payer does not match connected wallet", () => {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: alice.publicKey,
        toPubkey: bob.publicKey,
        lamports: 1_000_000,
      })
    );
    tx.feePayer = bob.publicKey; // mismatch

    const preview = TransactionIntrospector.introspect(tx, alice.publicKey);
    expect(preview.securityWarnings.length).toBeGreaterThan(0);
    expect(preview.securityWarnings[0]).toContain("Fee payer");
  });

  it("detects and flags unrecognized program IDs as security warnings", () => {
    const unknownProgram = new PublicKey("4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T");
    const tx = new Transaction().add(
      new TransactionInstruction({
        programId: unknownProgram,
        keys: [{ pubkey: alice.publicKey, isSigner: true, isWritable: true }],
        data: Buffer.from([]),
      })
    );
    tx.feePayer = alice.publicKey;

    const preview = TransactionIntrospector.introspect(tx, alice.publicKey);
    expect(preview.securityWarnings.some((w) => w.includes("unrecognized program"))).toBe(true);
  });
});
