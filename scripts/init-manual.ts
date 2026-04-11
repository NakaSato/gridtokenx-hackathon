/**
 * Initialize dual-token program on devnet — 2-step process to avoid stack overflow.
 * Step 1: init_mints (creates GRID + GRX mints)
 * Step 2: init_vault_and_config (creates TokenConfig + vault, mints GRX)
 */

import {
  PublicKey,
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { sha256 } from "js-sha256";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const RPC_URL = "https://api.devnet.solana.com";
const ENERGY_TOKEN_PROGRAM_ID = new PublicKey("B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH");
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
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
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
  }, "confirmed");

  if (confirmation.value.err) {
    console.error(`  ❌ ${label} failed:`, confirmation.value.err);
    try {
      const details = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
      if (details?.meta?.logMessages) {
        console.error("     Logs:", details.meta.logMessages.join("\n          "));
      }
    } catch {}
    return "";
  }

  console.log(`  ✅ ${label} confirmed`);
  return signature;
}

async function main() {
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  const authority = walletKeypair.publicKey;

  const connection = new Connection(RPC_URL, "confirmed");
  console.log(`\n  Network:    devnet`);
  console.log(`  RPC:        ${RPC_URL}`);
  console.log(`  Authority:  ${authority.toBase58()}`);
  const balance = await connection.getBalance(authority);
  console.log(`  Balance:    ${(balance / 1e9).toFixed(4)} SOL`);

  // PDAs
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
  const grxVaultAta = getAssociatedTokenAddressSync(grxMintPda, authority);

  console.log("\n  === PDA Addresses ===");
  console.log(`  TokenConfig: ${tokenConfigPda.toBase58()}`);
  console.log(`  GRID mint:   ${gridMintPda.toBase58()}`);
  console.log(`  GRX mint:    ${grxMintPda.toBase58()}`);
  console.log(`  GRX vault:   ${grxVaultAta.toBase58()}`);

  // Check if already initialized
  const gridInfo = await connection.getAccountInfo(gridMintPda);
  const grxInfo = await connection.getAccountInfo(grxMintPda);
  const tcInfo = await connection.getAccountInfo(tokenConfigPda);
  const vaultInfo = await connection.getAccountInfo(grxVaultAta);

  if (grxInfo && tcInfo && vaultInfo) {
    console.log("\n  ✅ Fully initialized!");
    try {
      const mint = await getMint(connection, grxMintPda);
      const vault = await getAccount(connection, grxVaultAta);
      console.log(`  GRX supply: ${Number(mint.supply) / 1e9}`);
      console.log(`  GRX vault:  ${Number(vault.amount) / 1e9}`);
    } catch (e: any) {
      console.log("  (Error reading vault:", e.message + ")");
    }
    return;
  }

  if (grxInfo && grxInfo.data.length > 0) {
    console.log("\n  ⚠️  Partial state — mints exist, vault/config missing");
  }

  // Step 1: init_mints (skip if mints already exist)
  if (!grxInfo || grxInfo.data.length === 0) {
    console.log("\n  === Step 1: init_mints ===");
    const ix1 = new TransactionInstruction({
      keys: [
        { pubkey: gridMintPda, isSigner: false, isWritable: true },
        { pubkey: grxMintPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      programId: ENERGY_TOKEN_PROGRAM_ID,
      data: discriminator("global:init_mints"),
    });

    const sig1 = await sendAndConfirm(connection, ix1, walletKeypair, "init_mints");
    if (!sig1) {
      console.error("\n  ❌ Failed to create mints. Aborting.");
      process.exit(1);
    }
  } else {
    console.log("\n  === Step 1: init_mints (skipped — mints exist) ===");
  }

  // Step 2: init_vault_and_config
  console.log("\n  === Step 2: init_vault_and_config ===");
  const ix2Data = Buffer.concat([
    discriminator("global:init_vault_and_config"),
    SystemProgram.programId.toBuffer(),
    authority.toBuffer(),
  ]);

  const ix2 = new TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: gridMintPda, isSigner: false, isWritable: true },
      { pubkey: grxMintPda, isSigner: false, isWritable: true },
      { pubkey: tokenConfigPda, isSigner: false, isWritable: true },
      { pubkey: grxVaultAta, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ENERGY_TOKEN_PROGRAM_ID,
    data: ix2Data,
  });

  const sig2 = await sendAndConfirm(connection, ix2, walletKeypair, "init_vault_and_config");
  if (!sig2) {
    console.error("\n  ❌ Failed to init vault. Aborting.");
    process.exit(1);
  }

  // Verify
  const mint = await getMint(connection, grxMintPda);
  const vault = await getAccount(connection, grxVaultAta);
  console.log("\n  ✅ Energy Token initialized on devnet!");
  console.log(`  GRX supply: ${Number(mint.supply) / 1e9}`);
  console.log(`  GRX vault:  ${Number(vault.amount) / 1e9}`);
  console.log(`  Explorer:   https://explorer.solana.com/address/${grxMintPda.toBase58()}?cluster=devnet`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
