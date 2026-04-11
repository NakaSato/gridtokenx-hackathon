/**
 * Update Metaplex metadata using the official Umi SDK.
 * The accounts exist with wallet as update authority — just need to update them.
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  updateV1,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  publicKey,
  transactionBuilder,
  createSignerFromKeypair,
} from "@metaplex-foundation/umi";
import { readFileSync } from "fs";

const RPC_URL = "https://api.devnet.solana.com";

async function main() {
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`;
  const secretKey = Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf-8")));

  const umi = createUmi(RPC_URL);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.identity = signer;
  umi.payer = signer;

  console.log("\n  Network:", "devnet");
  console.log("  Authority:", publicKey(signer.publicKey));

  const tokens = [
    {
      mint: "7ZYeoqMFdUW8V4M4eU2UmA2ivK1pHazeFawbMMX73zwd",
      name: "GridTokenX Energy Credit",
      symbol: "GRX",
      uri: "https://gridtokenx.com/metadata/grx.json",
    },
    {
      mint: "3r47MwnqJhKUzr1EGvvjc2ZoEK2axXVtjUPZyGD5fU3U",
      name: "GridTokenX Energy",
      symbol: "GRID",
      uri: "https://gridtokenx.com/metadata/grid.json",
    },
  ];

  for (const token of tokens) {
    console.log(`\n  === Updating ${token.symbol} ===`);
    const mintPubkey = publicKey(token.mint);

    try {
      const result = await transactionBuilder()
        .add(
          updateV1(umi, {
            mint: mintPubkey,
            name: token.name,
            symbol: token.symbol,
            uri: token.uri,
            sellerFeeBasisPoints: null, // Don't change
            tokenStandard: TokenStandard.Fungible,
            isMutable: null,
            primarySaleHappened: null,
          })
        )
        .sendAndConfirm(umi);

      console.log(`  ✅ ${token.symbol} metadata updated!`);
      console.log(`     Signature: ${result.signature}`);
    } catch (err: any) {
      if (err.message?.includes("Already") || err.message?.includes("already")) {
        console.log(`  ⚠️  ${token.symbol} already up to date`);
      } else {
        console.error(`  ❌ Failed for ${token.symbol}:`, err.message?.slice(0, 200));
      }
    }
  }

  console.log("\n  ✅ Done!");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
