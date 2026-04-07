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
  console.log("Initializing 16 Registry Shards...");

  for (let i = 0; i < 16; i++) {
    const [shardPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry_shard"), Buffer.from([i])],
      registryProgram.programId
    );

    try {
      const tx = await registryProgram.methods
        .initializeShard(i)
        .accounts({
          shard: shardPda,
          authority: authority,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log(`✅ Shard ${i} initialized at ${shardPda.toBase58()}`);
    } catch (e: any) {
      console.log(`⚠️  Shard ${i} already exists or skipped: ${e.message}`);
    }
  }

  console.log("\n✅ Registry Shards initialization complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
