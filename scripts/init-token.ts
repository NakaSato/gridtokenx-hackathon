/**
 * Initialize Dual-Token Energy Token
 *
 * Auto-detects network from env vars:
 *   SOLANA_RPC_URL  — e.g. https://api.devnet.solana.com
 *   ANCHOR_WALLET   — path to keypair (default: ~/.config/solana/id.json)
 *
 * Defaults to localnet (http://localhost:8899) if no RPC URL is set.
 *
 * Usage:
 *   # Localnet (default)
 *   npx tsx scripts/init-token.ts
 *
 *   # Devnet
 *   SOLANA_RPC_URL=https://api.devnet.solana.com npx tsx scripts/init-token.ts
 */

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
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ── Configuration ──────────────────────────────────────────────
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.ANCHOR_PROVIDER_URL ||
  "http://localhost:8899";

const IS_LOCALNET = RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1");
const CLUSTER = IS_LOCALNET ? "localnet" : "devnet";
const EXPLORER_CLUSTER = IS_LOCALNET ? "" : `?cluster=${CLUSTER}`;

const ENERGY_TOKEN_PROGRAM_ID = new PublicKey(
  "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH"
);
const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
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

  console.log(`  → ${label}...`);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  const confirmation = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });

  if (confirmation.value.err) {
    console.error(`  ❌ ${label} failed:`, confirmation.value.err);
    try {
      const details = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (details?.meta?.logMessages) {
        console.error("     Logs:", details.meta.logMessages.join("\n          "));
      }
    } catch {}
    return "";
  }

  console.log(`  ✅ ${label} confirmed`);
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

  const connection = new Connection(RPC_URL, "confirmed");

  console.log(`\n  Network:    ${CLUSTER}`);
  console.log(`  RPC:        ${RPC_URL}`);
  console.log(`  Authority:  ${authority.toBase58()}`);

  const balance = await connection.getBalance(authority);
  console.log(`  Balance:    ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance < 0.5 * 1e9) {
    console.error(`\n  ❌ Need ≥ 0.5 SOL on ${CLUSTER}`);
    if (IS_LOCALNET) {
      console.error("     Run: solana-test-validator --reset");
    } else {
      console.error("     Get SOL: https://faucet.solana.com/");
    }
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

  // Compute GRX vault ATA
  const [grxVaultAta] = PublicKey.findProgramAddressSync(
    [
      authority.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      grxMintPda.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("\n  === PDA Addresses ===");
  console.log(`  TokenConfig: ${tokenConfigPda.toBase58()}`);
  console.log(`  GRID mint:   ${gridMintPda.toBase58()}`);
  console.log(`  GRX mint:    ${grxMintPda.toBase58()}`);
  console.log(`  GRX vault:   ${grxVaultAta.toBase58()}`);

  // ── Step 1: initialize_dual_token (create all accounts) ───
  console.log("\n  === Step 1: initialize_dual_token ===");

  const gridMintInfo = await connection.getAccountInfo(gridMintPda);
  if (gridMintInfo) {
    console.log("  ⚠️  Already initialized — skipping");
    console.log(`  GRID mint: ${gridMintPda.toBase58()}`);
    console.log(`  GRX mint:  ${grxMintPda.toBase58()}`);
  } else {
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
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      ],
      programId: ENERGY_TOKEN_PROGRAM_ID,
      data: ixData,
    });

    const sig = await sendAndConfirm(connection, ix, walletKeypair, "initialize_dual_token");
    if (!sig) {
      console.error("\n  ❌ Failed to initialize dual token. Aborting.");
      process.exit(1);
    }
  }

  // ── Step 2: mint_grx_to_vault ───────────────────────────────
  console.log("\n  === Step 2: create_grx_metadata ===");

  const grxMintInfo = await connection.getAccountInfo(grxMintPda);
  if (grxMintInfo) {
    const grxVaultInfo = await connection.getAccountInfo(grxVaultAta);
    if (grxVaultInfo && grxVaultInfo.data.length > 0) {
      console.log("  ⚠️  GRX vault already funded — skipping");
    } else {
      const ixData = discriminator("global:mint_grx_to_vault");
      const ix = new TransactionInstruction({
        keys: [
          { pubkey: tokenConfigPda, isSigner: false, isWritable: true },
          { pubkey: grxMintPda, isSigner: false, isWritable: true },
          { pubkey: grxVaultAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        programId: ENERGY_TOKEN_PROGRAM_ID,
        data: ixData,
      });

      const sig = await sendAndConfirm(connection, ix, walletKeypair, "mint_grx_to_vault");
      if (sig) {
        console.log("  ✅ GRX vault funded with 100M GRX");
      } else {
        console.log("  ⚠️  mint_grx_to_vault failed — vault may need manual funding");
      }
    }
  }

  // ── Step 3: create_grx_metadata ─────────────────────────────
  console.log("\n  === Step 3: (skipped) ===");

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      grxMintPda.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
  );

  console.log(`  Metadata PDA: ${metadataPda.toBase58()}`);

  const metadataAccount = await connection.getAccountInfo(metadataPda);
  if (metadataAccount && metadataAccount.data.length > 1) {
    console.log("  ⚠️  Metadata already exists — skipping");
  } else {
    const ixData = discriminator("global:create_grx_metadata");

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: grxMintPda, isSigner: false, isWritable: false },
        { pubkey: tokenConfigPda, isSigner: false, isWritable: false },
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: METAPLEX_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
      ],
      programId: ENERGY_TOKEN_PROGRAM_ID,
      data: ixData,
    });

    const sig = await sendAndConfirm(connection, ix, walletKeypair, "create_grx_metadata");
    if (!sig) {
      console.log("  ⚠️  Metadata failed (Metaplex may not be deployed on this network)");
    }
  }

  // ── Done ─────────────────────────────────────────────────────
  console.log("\n  ✅ Energy Token initialized on", CLUSTER);
  console.log(`  GRID mint:  ${gridMintPda.toBase58()}`);
  console.log(`  GRX mint:   ${grxMintPda.toBase58()}`);
  console.log(`  Explorer:   https://explorer.solana.com/address/${grxMintPda.toBase58()}${EXPLORER_CLUSTER}`);
}

main().catch((err) => {
  console.error("\n  ❌ Fatal:", err.message);
  process.exit(1);
});
