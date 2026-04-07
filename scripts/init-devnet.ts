import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Registry } from "../target/types/registry";
import { Oracle } from "../target/types/oracle";
import { Governance } from "../target/types/governance";
import { PublicKey, Connection, Keypair, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import idlRegistry from "../target/idl/registry.json" assert { type: "json" };
import idlOracle from "../target/idl/oracle.json" assert { type: "json" };
import idlGovernance from "../target/idl/governance.json" assert { type: "json" };

async function main() {
  const walletPath = process.env.ANCHOR_WALLET || "/Users/chanthawat/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")))
  );
  
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed", preflightCommitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const authority = walletKeypair.publicKey;
  console.log("Authority:", authority.toBase58());

  // 1. Registry
  console.log("\n=== 1. Initializing Registry ===");
  const registryProgram = new Program<Registry>(
    { ...idlRegistry, address: "C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6" } as any,
    provider
  );
  
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    registryProgram.programId
  );

  try {
    const tx = await registryProgram.methods
      .initialize()
      .accounts({
        registry: registryPda,
        authority: authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Registry initialized");
    console.log("   Registry PDA:", registryPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Registry:", e.message.substring(0, 100));
  }

  // 2. Registry Shards (16)
  console.log("\n=== 2. Initializing 16 Registry Shards ===");
  let shardsOk = 0;
  for (let i = 0; i < 16; i++) {
    const [shardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry_shard"), Buffer.from([i])],
      registryProgram.programId
    );

    try {
      await registryProgram.methods
        .initializeShard(i)
        .accounts({
          shard: shardPda,
          authority: authority,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      shardsOk++;
      console.log(`✅ Shard ${i}: ${shardPda.toBase58()}`);
    } catch (e: any) {
      console.log(`⏭️  Shard ${i}: exists`);
    }
  }
  console.log(`✅ ${shardsOk}/16 shards initialized`);

  // 3. Oracle
  console.log("\n=== 3. Initializing Oracle ===");
  const oracleProgram = new Program<Oracle>(
    { ...idlOracle, address: "4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9" } as any,
    provider
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
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Oracle initialized");
    console.log("   Oracle Data PDA:", oracleDataPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Oracle:", e.message.substring(0, 100));
  }

  // 4. Governance
  console.log("\n=== 4. Initializing Governance ===");
  const governanceProgram = new Program<Governance>(
    { ...idlGovernance, address: "4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5" } as any,
    provider
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
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Governance (PoA) initialized");
    console.log("   PoA Config PDA:", poaConfigPda.toBase58());
    console.log("   TX:", tx);
  } catch (e: any) {
    console.log("⚠️  Governance:", e.message.substring(0, 100));
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Devnet initialization complete!");
  console.log("\nDeployed Programs:");
  console.log("  Registry:   C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6");
  console.log("  Oracle:     4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9");
  console.log("  Governance: 4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5");
  console.log("\nPending (needs SOL):");
  console.log("  Trading:    5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
