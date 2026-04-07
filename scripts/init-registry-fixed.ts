import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Registry } from "../target/types/registry";
import { PublicKey, Connection, Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";
import idlRegistry from "../target/idl/registry.json" assert { type: "json" };

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

  const deployedRegistryId = new PublicKey("C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6");
  const registryProgram = new Program<Registry>(
    { ...idlRegistry, address: deployedRegistryId.toBase58() } as any,
    provider
  );
  
  const authority = walletKeypair.publicKey;
  console.log("Authority:", authority.toBase58());
  console.log("Registry Program:", registryProgram.programId.toBase58());

  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    registryProgram.programId
  );

  console.log("Initializing Global Registry...");
  console.log("Registry PDA:", registryPda.toBase58());

  try {
    const tx = await registryProgram.methods
      .initialize()
      .accounts({
        registry: registryPda,
        authority: authority,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Registry initialized successfully!");
    console.log("Transaction:", tx);
    console.log(`Registry PDA: ${registryPda.toBase58()}`);
  } catch (e: any) {
    console.error(`❌ Failed to initialize registry: ${e.message}`);
    if (e.logs) {
      console.error("Logs:", e.logs);
    }
    process.exit(1);
  }
}

main();
