/**
 * Call create_token_mint on the deployed Energy Token program (devnet)
 *
 * Adds Metaplex metadata to the GRX token mint via the Anchor program.
 * No build required — uses inline IDL.
 *
 * Usage:
 *   npx tsx scripts/devnet-set-metadata.ts
 */

import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { sha256 } from "js-sha256";
import bs58 from "bs58";

// ── Configuration ──────────────────────────────────────────────
const DEVNET_RPC = "https://api.devnet.solana.com";
const ENERGY_TOKEN_PROGRAM_ID = new PublicKey(
  "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH"
);
const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const SYSVAR_RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
const SYSVAR_INSTRUCTIONS = new PublicKey(
  "Sysvar1nstructions1111111111111111111111111"
);

// ── Instruction discriminator for create_token_mint ────────────
// anchor discriminator = first 8 bytes of sha256("global:create_token_mint")
function discriminator(name: string): Buffer {
  const hash = sha256.digest(name);
  return Buffer.from(hash.slice(0, 8));
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  const walletPath =
    process.env.ANCHOR_WALLET ||
    `${process.env.HOME}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  const authority = walletKeypair.publicKey;

  const connection = new Connection(DEVNET_RPC, "confirmed");

  console.log("Authority:", authority.toBase58());

  // ── PDAs ─────────────────────────────────────────────────────
  const [tokenInfoPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_info_2022")],
    ENERGY_TOKEN_PROGRAM_ID
  );
  const [mintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_2022")],
    ENERGY_TOKEN_PROGRAM_ID
  );
  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mintPda.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  );

  console.log("\n=== PDA Addresses ===");
  console.log("  token_info PDA:", tokenInfoPda.toBase58());
  console.log("  mint PDA:       ", mintPda.toBase58());
  console.log("  metadata PDA:   ", metadataPda.toBase58());

  // ── Check if token_info exists ───────────────────────────────
  const tokenInfoAccount = await connection.getAccountInfo(tokenInfoPda);
  if (!tokenInfoAccount) {
    console.error(
      "\n❌ token_info PDA does not exist on devnet."
    );
    console.error(
      "The Energy Token program has not been initialized on devnet yet."
    );
    console.error(
      "You need to call initialize_token first (creates token_info + mint PDAs)."
    );
    process.exit(1);
  }
  console.log("\n✅ token_info PDA exists on devnet");

  // ── Check if mint exists ────────────────────────────────────
  const mintAccount = await connection.getAccountInfo(mintPda);
  if (!mintAccount) {
    console.error("\n❌ mint PDA does not exist on devnet.");
    console.error(
      "Call initialize_token first to create the mint."
    );
    process.exit(1);
  }
  console.log("✅ mint PDA exists on devnet:", mintPda.toBase58());

  // ── Check if metadata already exists ─────────────────────────
  const metadataAccount = await connection.getAccountInfo(metadataPda);
  if (metadataAccount && metadataAccount.data.length > 0) {
    console.log("⚠️  Metadata PDA already has data — metadata may already be set");
    console.log("   Skipping create_token_mint.");
    process.exit(0);
  }
  console.log("✅ No metadata found — proceeding with create_token_mint\n");

  // ── Build instruction ────────────────────────────────────────
  const ixData = discriminator("global:create_token_mint");

  const keys = [
    { pubkey: mintPda, isSigner: false, isWritable: false },
    { pubkey: tokenInfoPda, isSigner: false, isWritable: false },
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true }, // payer
    { pubkey: authority, isSigner: true, isWritable: false }, // authority
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: METAPLEX_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_INSTRUCTIONS, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({
    keys,
    programId: ENERGY_TOKEN_PROGRAM_ID,
    data: ixData,
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = authority;
  tx.recentBlockhash = (
    await connection.getLatestBlockhash("confirmed")
  ).blockhash;
  tx.sign(walletKeypair);

  console.log("Sending create_token_mint transaction...");
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  console.log("TX Signature:", signature);

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash: tx.recentBlockhash!,
    lastValidBlockHeight: (
      await connection.getLatestBlockhash("confirmed")
    ).lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    console.error("❌ Transaction failed:", confirmation.value.err);

    // Try to get logs for more detail
    try {
      const txDetails = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (txDetails?.meta?.logMessages) {
        console.error("Logs:", txDetails.meta.logMessages);
      }
    } catch {}
    process.exit(1);
  }

  console.log("✅ create_token_mint successful!");
  console.log("   Mint:", mintPda.toBase58());
  console.log("   Metadata:", metadataPda.toBase58());
  console.log(
    `   Explorer: https://explorer.solana.com/address/${mintPda.toBase58()}?cluster=devnet`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
