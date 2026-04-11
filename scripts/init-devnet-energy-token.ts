/**
 * Initialize Dual-Token Energy Token on Devnet
 *
 * Step 1: initialize_dual_token → creates TokenConfig + GRID mint + GRX mint + 100M GRX pre-mint
 * Step 2: create_grx_metadata → adds Metaplex metadata to GRX mint
 *
 * Usage:
 *   npx tsx scripts/init-devnet-energy-token.ts
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
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ── Configuration ──────────────────────────────────────────────
const DEVNET_RPC = "https://api.devnet.solana.com";
const ENERGY_TOKEN_PROGRAM_ID = new PublicKey(
  "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH"
);
const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const SPL_TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const SYSVAR_RENT = new PublicKey("SysvarRent111111111111111111111111111111111");

function discriminator(name: string): Buffer {
  const hash = sha256.digest(name);
  return Buffer.from(hash.slice(0, 8));
}

async function sendAndConfirm(
  connection: Connection,
  ix: TransactionInstruction,
  payer: Keypair,
  label: string
): Promise<string> {
  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  console.log(`Sending ${label}...`);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  console.log(`  Signature: ${signature}`);

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    console.error(`❌ ${label} failed:`, confirmation.value.err);
    try {
      const details = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (details?.meta?.logMessages) {
        console.error("  Logs:", details.meta.logMessages.join("\n       "));
      }
    } catch {}
    return "";
  }

  console.log(`✅ ${label} confirmed`);
  return signature;
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

  const balance = await connection.getBalance(authority);
  console.log("Balance:    ", (balance / 1e9).toFixed(4), "SOL");
  if (balance < 3 * 1e9) {
    console.error(
      "❌ Insufficient balance — need ≥ 3 SOL for redeployment."
    );
    console.error("   Get devnet SOL: https://faucet.solana.com/");
    process.exit(1);
  }

  // ── PDAs ─────────────────────────────────────────────────────
  const [tokenConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_config")],
    ENERGY_TOKEN_PROGRAM_ID
  );
  const [gridMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("grid_mint")],
    ENERGY_TOKEN_PROGRAM_ID
  );
  const [grxMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("grx_mint")],
    ENERGY_TOKEN_PROGRAM_ID
  );
  const grxVault = await PublicKey.createWithSeed(
    authority,
    await (async () => {
      // For ATA we need the associated token address
      const [ata] = PublicKey.findProgramAddressSync(
        [
          authority.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          grxMintPda.toBuffer(),
        ],
        new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
      );
      return ata;
    })()
  ).catch(() => {
    // Fallback: compute ATA directly
    const [ata] = PublicKey.findProgramAddressSync(
      [
        authority.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        grxMintPda.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ata;
  });

  // Compute GRX vault ATA directly
  const [grxVaultAta] = PublicKey.findProgramAddressSync(
    [
      authority.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      grxMintPda.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("\n=== PDA Addresses ===");
  console.log("  TokenConfig PDA:", tokenConfigPda.toBase58());
  console.log("  GRID mint PDA:  ", gridMintPda.toBase58());
  console.log("  GRX mint PDA:   ", grxMintPda.toBase58());
  console.log("  GRX vault ATA:  ", grxVaultAta.toBase58());

  // ── Step 1: initialize_dual_token ───────────────────────────
  console.log("\n=== Step 1: initialize_dual_token ===");

  const tokenConfigAccount = await connection.getAccountInfo(tokenConfigPda);
  if (tokenConfigAccount) {
    console.log("⚠️  TokenConfig PDA already exists — skipping step 1");
    console.log("   GRID mint:", gridMintPda.toBase58());
    console.log("   GRX mint: ", grxMintPda.toBase58());
  } else {
    // Encode args: registry_program_id (Pubkey), registry_authority (Pubkey)
    const ixData = Buffer.concat([
      discriminator("global:initialize_dual_token"),
      SystemProgram.programId.toBuffer(),
      authority.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: tokenConfigPda, isSigner: false, isWritable: true },
        { pubkey: gridMintPda, isSigner: false, isWritable: true },
        { pubkey: grxMintPda, isSigner: false, isWritable: true },
        { pubkey: grxVaultAta, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      ],
      programId: ENERGY_TOKEN_PROGRAM_ID,
      data: ixData,
    });

    const sig = await sendAndConfirm(connection, ix, walletKeypair, "initialize_dual_token");
    if (!sig) {
      console.error("\n❌ Failed to initialize dual token. Aborting.");
      process.exit(1);
    }
    console.log("  GRID mint:", gridMintPda.toBase58());
    console.log("  GRX mint: ", grxMintPda.toBase58());
    console.log("  GRX vault:", grxVaultAta.toBase58());
  }

  // ── Step 2: create_grx_metadata ─────────────────────────────
  console.log("\n=== Step 2: create_grx_metadata ===");

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      grxMintPda.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  );

  console.log("  Metadata PDA:", metadataPda.toBase58());

  const metadataAccount = await connection.getAccountInfo(metadataPda);
  if (metadataAccount && metadataAccount.data.length > 1) {
    console.log("⚠️  Metadata PDA already has data — skipping step 2");
  } else {
    const ixData = discriminator("global:create_grx_metadata");

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: grxMintPda, isSigner: false, isWritable: false },
        { pubkey: tokenConfigPda, isSigner: false, isWritable: false },
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true }, // payer
        { pubkey: authority, isSigner: true, isWritable: false }, // authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METAPLEX_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      ],
      programId: ENERGY_TOKEN_PROGRAM_ID,
      data: ixData,
    });

    const sig = await sendAndConfirm(connection, ix, walletKeypair, "create_grx_metadata");
    if (!sig) {
      console.error("\n❌ Failed to create GRX metadata.");
      console.error("   This may fail if Metaplex program is not deployed on devnet.");
      console.error("   You can still use the token — metadata can be added later.");
    } else {
      console.log("  Metadata PDA:", metadataPda.toBase58());
    }
  }

  // ── Done ─────────────────────────────────────────────────────
  console.log("\n✅ Energy Token (dual-token) initialization on devnet complete!");
  console.log(`   GRID mint:  ${gridMintPda.toBase58()}`);
  console.log(`   GRX mint:   ${grxMintPda.toBase58()}`);
  console.log(`   GRX vault:  ${grxVaultAta.toBase58()}`);
  console.log(
    `   Explorer: https://explorer.solana.com/address/${grxMintPda.toBase58()}?cluster=devnet`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
