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

async function testProgram(name: string, programId: string, idl: any) {
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

  const program = new Program({ ...idl, address: programId } as any, provider);
  
  // Try to fetch program account info
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(programId));
    if (accountInfo) {
      console.log(`✅ ${name}: Deployed (${accountInfo.data.length} bytes)`);
      return true;
    } else {
      console.log(`❌ ${name}: Not found on-chain`);
      return false;
    }
  } catch (e: any) {
    console.log(`❌ ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log("=== GridTokenX Deployment Verification ===\n");

  const programs = [
    { name: "Registry", id: "C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6", idl: idlRegistry },
    { name: "Oracle", id: "4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9", idl: idlOracle },
    { name: "Governance", id: "4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5", idl: idlGovernance },
    { name: "Energy Token", id: "B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH", idl: idlEnergyToken },
    { name: "Trading", id: "5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA", idl: idlTrading },
  ];

  let passed = 0;
  let failed = 0;

  for (const prog of programs) {
    const success = await testProgram(prog.name, prog.id, prog.idl);
    if (success) passed++;
    else failed++;
  }

  console.log(`\n=== Results: ${passed}/${programs.length} programs verified ===`);
  
  if (failed === 0) {
    console.log("✅ All programs deployed and accessible!");
  } else {
    console.log(`⚠️  ${failed} program(s) failed verification`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
