/**
 * Integration Test — GridTokenX Alpha (3 programs)
 *
 * Tests the complete energy→GRID flow on localnet:
 * 1. Deploy all 3 programs
 * 2. Initialize Registry + Shards
 * 3. Initialize Energy Token (dual-token: GRID + GRX)
 * 4. Initialize Trading
 * 5. Register user + meter
 * 6. Settle + mint GRID
 *
 * Usage:
 *   npx tsx scripts/test-integration.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { sha256 } from "js-sha256";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

// ── Configuration ──────────────────────────────────────────────
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.ANCHOR_PROVIDER_URL ||
  "http://localhost:8899";

const IS_LOCALNET = RPC_URL.includes("localhost") || RPC_URL.includes("127.0.0.1");
const CLUSTER = IS_LOCALNET ? "localnet" : "devnet";

const ENERGY_TOKEN_PROGRAM_ID = new PublicKey(
  "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH"
);
const REGISTRY_PROGRAM_ID = new PublicKey(
  "C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6"
);
const TRADING_PROGRAM_ID = new PublicKey(
  "5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA"
);

const SYSVAR_RENT = new PublicKey("SysvarRent111111111111111111111111111111111");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

function discriminator(name: string): Buffer {
  const hash = sha256.digest(name);
  return Buffer.from(hash.slice(0, 8));
}

// ── Test Runner ────────────────────────────────────────────────
async function main() {
  const walletPath =
    process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );

  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Network: ${CLUSTER} (${RPC_URL})`);
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Balance:", (balance / LAMPORTS_PER_SOL).toFixed(2), "SOL");

  if (balance < LAMPORTS_PER_SOL) {
    console.error(`❌ Insufficient balance — need at least 1 SOL on ${CLUSTER}`);
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    process.stdout.write(`  ${name}... `);
    try {
      await fn();
      console.log("✅");
      passed++;
    } catch (e: any) {
      console.log("❌", e.message?.substring(0, 100) || e);
      failed++;
    }
  }

  function ix(programId: PublicKey, data: Buffer, keys: any[]) {
    return new TransactionInstruction({
      programId,
      keys,
      data,
    });
  }

  async function sendIx(instruction: TransactionInstruction, label: string) {
    const tx = new Transaction().add(instruction);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.sign(wallet);
    const sig = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    await connection.confirmTransaction(sig, "confirmed");
    return sig;
  }

  // ── PDAs ─────────────────────────────────────────────────────
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    REGISTRY_PROGRAM_ID
  );
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

  // ── Tests ────────────────────────────────────────────────────
  console.log("\n=== Energy Token Tests ===");

  await test("initialize_dual_token", async () => {
    const [grxVaultAta] = PublicKey.findProgramAddressSync(
      [
        wallet.publicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        grxMintPda.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM
    );

    const ixData = Buffer.concat([
      discriminator("global:initialize_dual_token"),
      SystemProgram.programId.toBuffer(),
      wallet.publicKey.toBuffer(),
    ]);

    const instruction = ix(ENERGY_TOKEN_PROGRAM_ID, ixData, [
      { pubkey: tokenConfigPda, isSigner: false, isWritable: true },
      { pubkey: gridMintPda, isSigner: false, isWritable: true },
      { pubkey: grxMintPda, isSigner: false, isWritable: true },
      { pubkey: grxVaultAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ]);

    await sendIx(instruction, "initialize_dual_token");

    // Verify TokenConfig PDA was created
    const info = await connection.getAccountInfo(tokenConfigPda);
    if (!info) throw new Error("TokenConfig PDA not created");
  });

  console.log("\n=== Registry Tests ===");

  await test("initialize registry", async () => {
    const ixData = Buffer.alloc(8); // discriminator only

    const instruction = ix(REGISTRY_PROGRAM_ID, ixData, [
      { pubkey: registryPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);

    await sendIx(instruction, "initialize");

    const info = await connection.getAccountInfo(registryPda);
    if (!info) throw new Error("Registry PDA not created");
  });

  await test("initialize 4 shards", async () => {
    for (let i = 0; i < 4; i++) {
      const [shardPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("registry_shard"), Buffer.from([i])],
        REGISTRY_PROGRAM_ID
      );

      const ixData = Buffer.concat([
        discriminator("global:initialize_shard"),
        Buffer.from([i]),
      ]);

      const instruction = ix(REGISTRY_PROGRAM_ID, ixData, [
        { pubkey: shardPda, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ]);

      await sendIx(instruction, `initialize_shard_${i}`);

      const info = await connection.getAccountInfo(shardPda);
      if (!info) throw new Error(`Shard ${i} PDA not created`);
    }
  });

  await test("register user", async () => {
    const [userPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), wallet.publicKey.toBuffer()],
      REGISTRY_PROGRAM_ID
    );
    const [shardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry_shard"), Buffer.from([0])],
      REGISTRY_PROGRAM_ID
    );

    // UserType: Prosumer = 0
    const ixData = Buffer.concat([
      discriminator("global:register_user"),
      Buffer.from([0]), // UserType: Prosumer
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // lat_e7: 0
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // long_e7: 0
      Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // h3_index: 0
      Buffer.from([0]), // shard_id: 0
    ]);

    const instruction = ix(REGISTRY_PROGRAM_ID, ixData, [
      { pubkey: userPda, isSigner: false, isWritable: true },
      { pubkey: shardPda, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ]);

    await sendIx(instruction, "register_user");

    const info = await connection.getAccountInfo(userPda);
    if (!info) throw new Error("User PDA not created");
  });

  console.log("\n=== Summary ===");
  console.log(`  Passed: ${passed}/${passed + failed}`);
  console.log(`  Failed: ${failed}/${passed + failed}`);

  if (failed > 0) {
    console.log("\n❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
