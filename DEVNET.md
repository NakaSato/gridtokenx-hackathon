# GridTokenX Devnet Deployment

**Network:** Solana Devnet  
**Date:** April 7, 2026  
**Authority:** `BT9ESAZoNGnvPswpeHNLgt582GTQrAUv21ZLkk4H6Bad`

## Deployed & Initialized Programs

| Program | Program ID | Status |
|---------|-----------|--------|
| **Registry** | `C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6` | ✅ Deployed & Initialized |
| **Registry Shards (16)** | All shards created | ✅ |
| **Oracle** | `4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9` | ✅ Deployed & Initialized |
| **Governance** | `4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5` | ✅ Deployed & Initialized |

## Pending Deployment

| Program | Program ID | Status |
|---------|-----------|--------|
| **Energy Token** | `B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH` | ✅ Deployed (needs init) |
| **Trading** | `5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA` | ⏳ Needs ~4.2 SOL |

## Explorer Links

Verify on Solana Explorer (Devnet):
- Registry: https://explorer.solana.com/address/C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6?cluster=devnet
- Oracle: https://explorer.solana.com/address/4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9?cluster=devnet
- Governance: https://explorer.solana.com/address/4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5?cluster=devnet

## Next Steps

1. Get ~5 SOL from https://faucet.solana.com/ or https://solfaucet.com/
2. Deploy Trading program: `solana program deploy target/deploy/trading.so --program-id target/deploy/trading-keypair.json --url devnet`
3. Initialize Trading: `npx tsx scripts/init-devnet.ts`
