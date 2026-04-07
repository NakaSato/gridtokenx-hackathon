import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { EnergyToken } from "../target/types/energy_token";
import { Trading } from "../target/types/trading";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import idlEnergyToken from "../target/idl/energy_token.json" assert { type: "json" };
import idlTrading from "../target/idl/trading.json" assert { type: "json" };
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

async function main() {
  const walletPath = process.env.ANCHOR_WALLET || "/Users/chanthawat/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  
  const connection = new Connection("http://localhost:8899", "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const authority = walletKeypair.publicKey;
  console.log("Authority:", authority.toBase58());

  // Initialize Energy Token
  console.log("\n=== Initializing Energy Token ===");
  const energyTokenProgram = new Program<EnergyToken>(
    { ...idlEnergyToken, address: "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH" } as any,
    provider
  );

  // Create GRX token mint
  console.log("Creating GRX token mint...");
  const grxMint = await createMint(
    connection,
    walletKeypair,
    authority,
    null, // freeze authority
    9, // decimals
  );
  console.log("✅ GRX Mint created:", grxMint.toBase58());

  // Initialize energy token program
  const [mintAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    energyTokenProgram.programId
  );

  try {
    const tx = await energyTokenProgram.methods
      .initialize()
      .accounts({
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Energy Token program initialized");
    console.log("   Mint Authority PDA:", mintAuthorityPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Energy Token already exists or failed:", e.message);
  }

  // Initialize Trading
  console.log("\n=== Initializing Trading ===");
  const tradingProgram = new Program<Trading>(
    { ...idlTrading, address: "5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA" } as any,
    provider
  );

  // Initialize Program
  const [tradingAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("trading_authority")],
    tradingProgram.programId
  );

  try {
    const tx = await tradingProgram.methods
      .initializeProgram()
      .accounts({
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Trading program initialized");
    console.log("   Trading Authority PDA:", tradingAuthorityPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Trading already exists or failed:", e.message);
  }

  // Initialize Market
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market")],
    tradingProgram.programId
  );

  const currencyMint = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL for testing
  const energyMint = new PublicKey(grxMint.toBase58());

  try {
    const tx = await tradingProgram.methods
      .initializeMarket(16) // 16 shards
      .accounts({
        market: marketPda,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Market initialized");
    console.log("   Market PDA:", marketPda.toBase58());
    console.log("   Currency Mint:", currencyMint.toBase58());
    console.log("   Energy Mint:", energyMint.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Market already exists or failed:", e.message);
  }

  console.log("\n✅ Energy Token & Trading initialization complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
