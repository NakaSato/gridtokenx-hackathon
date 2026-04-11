/**
 * Create Metaplex metadata accounts for GRX and GRID tokens.
 * Uses raw SPL Token metadata program (v3) with correct instruction format.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import { readFileSync } from "fs";

const RPC_URL = "https://api.devnet.solana.com";
const META_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

/**
 * Build CreateV1 instruction data for mpl-token-metadata v3.
 * Layout: discriminator (8 bytes) + CreateV1Args (borsh)
 * CreateV1 discriminator = sha256("global:create_v1")[0:8] = [0x2a, 0x9a, 0x3c, 0x1d, 0x54, 0x0b, 0x0f, 0x37]
 * 
 * CreateV1Args borsh:
 *   name: String
 *   symbol: String  
 *   uri: String
 *   seller_fee_basis_points: u16
 *   creators: Option<Vec<Creator>>
 *   primary_sale_happened: bool
 *   is_mutable: bool
 *   token_standard: u8 (Fungible=2)
 *   collection: Option<Collection>
 *   uses: Option<Uses>
 *   rule_set: Option<Pubkey>
 *   collection_details: Option<CollectionDetails>
 */
function buildCreateV1Data(
  name: string,
  symbol: string,
  uri: string
): Buffer {
  const nameBuf = Buffer.from(name, "utf8");
  const symBuf = Buffer.from(symbol, "utf8");
  const uriBuf = Buffer.from(uri, "utf8");

  return Buffer.concat([
    // Discriminator: sha256("global:create_v1")[0:8]
    Buffer.from([0x2a, 0x9a, 0x3c, 0x1d, 0x54, 0x0b, 0x0f, 0x37]),
    // name
    Buffer.from([nameBuf.length, 0, 0, 0]),
    nameBuf,
    // symbol
    Buffer.from([symBuf.length, 0, 0, 0]),
    symBuf,
    // uri
    Buffer.from([uriBuf.length, 0, 0, 0]),
    uriBuf,
    // seller_fee_basis_points: 0
    Buffer.from([0, 0]),
    // creators: None (0)
    Buffer.from([0]),
    // primary_sale_happened: false
    Buffer.from([0]),
    // is_mutable: true
    Buffer.from([1]),
    // token_standard: Fungible (2)
    Buffer.from([2]),
    // collection: None
    Buffer.from([0]),
    // uses: None
    Buffer.from([0]),
    // rule_set: None
    Buffer.from([0]),
    // collection_details: None
    Buffer.from([0]),
  ]);
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

  const tokens = [
    {
      mint: new PublicKey("7ZYeoqMFdUW8V4M4eU2UmA2ivK1pHazeFawbMMX73zwd"),
      name: "GridTokenX Energy Credit",
      symbol: "GRX",
      uri: "https://gridtokenx.com/metadata/grx.json",
    },
    {
      mint: new PublicKey("3r47MwnqJhKUzr1EGvvjc2ZoEK2axXVtjUPZyGD5fU3U"),
      name: "GridTokenX Energy",
      symbol: "GRID",
      uri: "https://gridtokenx.com/metadata/grid.json",
    },
  ];

  for (const token of tokens) {
    console.log(`\n  === ${token.symbol} ===`);

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), META_PROGRAM.toBuffer(), token.mint.toBuffer()],
      META_PROGRAM
    );

    const existing = await connection.getAccountInfo(metadataPda);
    if (existing && existing.data.length > 64) {
      console.log(`  ✅ Already has metadata`);
      continue;
    }

    const data = buildCreateV1Data(token.name, token.symbol, token.uri);

    const ix = {
      programId: META_PROGRAM,
      keys: [
        { pubkey: metadataPda, isSigner: false, isWritable: true },
        { pubkey: token.mint, isSigner: false, isWritable: false },
        { pubkey: authority, isSigner: false, isWritable: false }, // mint authority
        { pubkey: authority, isSigner: true, isWritable: true }, // payer
        { pubkey: authority, isSigner: false, isWritable: false }, // update authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    };

    const tx = new Transaction();
    tx.add(ix as any);
    tx.feePayer = authority;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.recentBlockhash = blockhash;
    tx.sign(wallet);

    console.log(`  → Creating...`);
    try {
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
        console.error(`  ❌ Failed:`, conf.value.err);
      } else {
        console.log(`  ✅ Created!`);
        console.log(`     TX: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
      }
    } catch (err: any) {
      console.error(`  ❌ Error:`, err.message);
    }
  }

  console.log("\n  ✅ Done!");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
