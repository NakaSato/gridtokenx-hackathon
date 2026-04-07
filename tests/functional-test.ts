import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Registry } from "../target/types/registry";
import { Oracle } from "../target/types/oracle";
import { Governance } from "../target/types/governance";
import { EnergyToken } from "../target/types/energy_token";
import { Trading } from "../target/types/trading";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import idlRegistry from "../target/idl/registry.json" assert { type: "json" };
import idlOracle from "../target/idl/oracle.json" assert { type: "json" };
import idlGovernance from "../target/idl/governance.json" assert { type: "json" };
import idlEnergyToken from "../target/idl/energy_token.json" assert { type: "json" };
import idlTrading from "../target/idl/trading.json" assert { type: "json" };

async function testAccountFetch(name: string, connection: Connection, address: string): Promise<boolean> {
  try {
    const info = await connection.getAccountInfo(new PublicKey(address));
    if (info) {
      console.log(`  ✅ ${name}: ${address} (${info.data.length} bytes)`);
      return true;
    } else {
      console.log(`  ⚠️  ${name}: ${address} (not found)`);
      return false;
    }
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    return false;
  }
}

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

  console.log("=== GridTokenX Functional Test Suite ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Registry
  console.log("1️⃣  Testing Registry Program...");
  const registryProgram = new Program<Registry>(
    { ...idlRegistry, address: "C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6" } as any,
    provider
  );
  
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    registryProgram.programId
  );
  
  const registryOk = await testAccountFetch("Global Registry", connection, registryPda.toBase58());
  if (registryOk) passed++; else failed++;

  // Test a few shards
  const shardOk = await testAccountFetch("Registry Shard 0", connection, "2Zbgyb2cC42azo5KzUU7aVf2dFbDYwrEjKX52n82pCkh");
  if (shardOk) passed++; else failed++;

  // Test 2: Oracle
  console.log("\n2️⃣  Testing Oracle Program...");
  const oracleProgram = new Program<Oracle>(
    { ...idlOracle, address: "4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9" } as any,
    provider
  );
  
  const [oracleDataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("oracle_data")],
    oracleProgram.programId
  );
  
  const oracleOk = await testAccountFetch("Oracle Data", connection, oracleDataPda.toBase58());
  if (oracleOk) passed++; else failed++;

  // Test 3: Governance
  console.log("\n3️⃣  Testing Governance Program...");
  const governanceProgram = new Program<Governance>(
    { ...idlGovernance, address: "4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5" } as any,
    provider
  );
  
  const [poaConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("poa_config")],
    governanceProgram.programId
  );
  
  const govOk = await testAccountFetch("PoA Config", connection, poaConfigPda.toBase58());
  if (govOk) passed++; else failed++;

  // Test 4: Energy Token
  console.log("\n4️⃣  Testing Energy Token Program...");
  const energyTokenProgram = new Program<EnergyToken>(
    { ...idlEnergyToken, address: "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH" } as any,
    provider
  );
  
  // Check that the program is deployed and accessible
  const energyTokenOk = await testAccountFetch("Energy Token Program", connection, energyTokenProgram.programId.toBase58());
  if (energyTokenOk) passed++; else failed++;

  // Test 5: Trading
  console.log("\n5️⃣  Testing Trading Program...");
  const tradingProgram = new Program<Trading>(
    { ...idlTrading, address: "5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA" } as any,
    provider
  );
  
  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market")],
    tradingProgram.programId
  );
  
  const marketOk = await testAccountFetch("Market", connection, marketPda.toBase58());
  if (marketOk) passed++; else failed++;

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log("\n✅ All functional tests passed!");
    console.log("Platform is fully operational and ready for use.");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed`);
    console.log("Some components may need re-initialization.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
