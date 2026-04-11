/**
 * Initialize Registry and Trading programs on devnet.
 * Uses raw instructions with correct discriminators.
 */

import {
  PublicKey,
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { readFileSync } from "fs";
import { sha256 } from "js-sha256";

const RPC_URL = "https://api.devnet.solana.com";
const REGISTRY_ID = new PublicKey("C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6");
const TRADING_ID = new PublicKey("5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA");
const ENERGY_TOKEN_ID = new PublicKey("B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH");

function discriminator(name: string): Buffer {
  const hash = sha256.digest(name);
  return Buffer.from(hash.slice(0, 8));
}

async function sendIx(
  connection: Connection,
  ix: TransactionInstruction,
  wallet: Keypair,
  label: string
): Promise<string> {
  const tx = new Transaction().add(ix);
  tx.feePayer = wallet.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.sign(wallet);

  console.log(`  → ${label}...`);
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  const conf = await connection.confirmTransaction({
    signature: sig,
    blockhash,
    lastValidBlockHeight,
  }, "confirmed");

  if (conf.value.err) {
    console.error(`  ❌ ${label} failed:`, conf.value.err);
    try {
      const details = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (details?.meta?.logMessages) {
        console.error("     Logs:", details.meta.logMessages.slice(-5).join("\n          "));
      }
    } catch {}
    return "";
  }

  console.log(`  ✅ ${label}:`, sig);
  return sig;
}

async function main() {
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  const authority = wallet.publicKey;

  const connection = new Connection(RPC_URL, "confirmed");
  console.log("\n  Network:", "devnet");
  console.log("  Authority:", authority.toBase58());
  const balance = await connection.getBalance(authority);
  console.log("  Balance:", (balance / 1e9).toFixed(4), "SOL");

  // ── Registry: initialize_shard ──────────────────────────────
  console.log("\n  === Registry: initialize_shard ===");

  const [shardPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("shard"), Buffer.from([0])],
    REGISTRY_ID
  );
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    REGISTRY_ID
  );

  console.log("  Shard PDA:", shardPda.toBase58());
  console.log("  Registry PDA:", registryPda.toBase58());

  const shardInfo = await connection.getAccountInfo(shardPda);
  if (shardInfo && shardInfo.data.length > 0) {
    console.log("  ⚠️  Shard already initialized — skipping");
  } else {
    // initialize_shard(ixData = shard_id: u64 = 0)
    const ixData = Buffer.concat([
      discriminator("global:initialize_shard"),
      Buffer.alloc(8), // shard_id = 0 (u64 LE)
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: shardPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: REGISTRY_ID,
      data: ixData,
    });

    const sig = await sendIx(connection, ix, wallet, "initialize_shard");
    if (!sig) {
      console.error("  ❌ Registry init failed. Continuing anyway...");
    }
  }

  // ── Trading: initialize_program ─────────────────────────────
  console.log("\n  === Trading: initialize_program ===");

  const [tradingConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("trading_config")],
    TRADING_ID
  );
  console.log("  Trading Config PDA:", tradingConfigPda.toBase58());

  const tradingInfo = await connection.getAccountInfo(tradingConfigPda);
  if (tradingInfo && tradingInfo.data.length > 0) {
    console.log("  ⚠️  Trading already initialized — skipping");
  } else {
    // initialize_program(ixData = energy_token_program_id)
    const ixData = Buffer.concat([
      discriminator("global:initialize_program"),
      ENERGY_TOKEN_ID.toBuffer(),
    ]);

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: tradingConfigPda, isSigner: false, isWritable: true },
        { pubkey: authority, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: TRADING_ID,
      data: ixData,
    });

    const sig = await sendIx(connection, ix, wallet, "initialize_program");
    if (!sig) {
      console.error("  ❌ Trading init failed. Continuing anyway...");
    }
  }

  console.log("\n  ✅ Devnet initialization complete!");
  console.log("\n  Program IDs:");
  console.log(`    Registry:      ${REGISTRY_ID.toBase58()}`);
  console.log(`    Trading:       ${TRADING_ID.toBase58()}`);
  console.log(`    Energy Token:  ${ENERGY_TOKEN_ID.toBase58()}`);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
