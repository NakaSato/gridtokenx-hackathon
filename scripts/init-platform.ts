import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Oracle } from "../target/types/oracle";
import { Governance } from "../target/types/governance";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import idlOracle from "../target/idl/oracle.json" assert { type: "json" };
import idlGovernance from "../target/idl/governance.json" assert { type: "json" };

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

  // Initialize Oracle
  console.log("\n=== Initializing Oracle ===");
  const oracleProgram = new Program<Oracle>(
    { ...idlOracle, address: "4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9" } as any,
    provider
  );

  const [oracleAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_authority")],
    oracleProgram.programId
  );

  const [oracleDataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_data")],
    oracleProgram.programId
  );

  try {
    const tx = await oracleProgram.methods
      .initialize(authority)
      .accounts({
        oracleData: oracleDataPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Oracle initialized");
    console.log("   Oracle Data PDA:", oracleDataPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Oracle already exists or failed:", e.message);
  }

  // Initialize Governance
  console.log("\n=== Initializing Governance ===");
  const governanceProgram = new Program<Governance>(
    { ...idlGovernance, address: "4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5" } as any,
    provider
  );

  const [governanceAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("governance_authority")],
    governanceProgram.programId
  );

  const [poaConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("poa_config")],
    governanceProgram.programId
  );

  try {
    const tx = await governanceProgram.methods
      .initializePoa()
      .accounts({
        poaConfig: poaConfigPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Governance (PoA) initialized");
    console.log("   PoA Config PDA:", poaConfigPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Governance already exists or failed:", e.message);
  }

  console.log("\n✅ Platform initialization complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
