# GridTokenX

Decentralized peer-to-peer energy trading on Solana. 1 GRX = 1 kWh.

## Programs

| Program | Description |
|---------|-------------|
| **Registry** | User identity, smart meter registration, settlement orchestration |
| **Oracle** | Smart meter data validation, anomaly detection, market clearing |
| **Governance** | PoA authority, REC certificate issuance, emergency controls |
| **Energy Token** | GRX token management (SPL Token-2022), PDA-controlled minting |
| **Trading** | P2P order matching, continuous double auction, sharded order book |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all programs
anchor build

# Start local validator and run tests
solana-test-validator --reset &
anchor test
```

## Project Structure

```
├── programs/          # 5 Anchor programs (Rust/Solana)
├── scripts/           # Deployment and initialization scripts
├── tests/             # Test suite (TypeScript)
├── docs/              # Program documentation
└── target/deploy/     # Compiled programs + keypairs
```

## Deployment

### Localnet

```bash
# Build and deploy
anchor build
solana program deploy target/deploy/oracle.so --program-id target/deploy/oracle-keypair.json
solana program deploy target/deploy/governance.so --program-id target/deploy/governance-keypair.json
solana program deploy target/deploy/registry.so --program-id target/deploy/registry-keypair.json
solana program deploy target/deploy/energy_token.so --program-id target/deploy/energy_token-keypair.json
solana program deploy target/deploy/trading.so --program-id target/deploy/trading-keypair.json

# Initialize programs
npx tsx scripts/init-platform.ts
npx tsx scripts/init-energy-trading.ts
```

### Devnet

```bash
solana config set --url devnet
# Need ~10 SOL for all 5 programs

# Deploy
solana program deploy target/deploy/oracle.so --program-id target/deploy/oracle-keypair.json --url devnet
solana program deploy target/deploy/governance.so --program-id target/deploy/governance-keypair.json --url devnet
solana program deploy target/deploy/registry.so --program-id target/deploy/registry-keypair.json --url devnet
solana program deploy target/deploy/energy_token.so --program-id target/deploy/energy_token-keypair.json --url devnet
solana program deploy target/deploy/trading.so --program-id target/deploy/trading-keypair.json --url devnet

# Initialize
npx tsx scripts/init-devnet.ts
```

## Deployed Program IDs (Devnet)

| Program | Program ID |
|---------|-----------|
| Registry | `C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6` |
| Oracle | `4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9` |
| Governance | `4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5` |
| Energy Token | `B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH` |
| Trading | `5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA` |

Verify on [Solana Explorer (Devnet)](https://explorer.solana.com/address/C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6?cluster=devnet).

## Current Status

| Network | Status |
|---------|--------|
| **Localnet** | ✅ 5/5 deployed & initialized |
| **Devnet** | ⚠️ 4/5 deployed, Trading needs ~4.2 SOL |
| **Mainnet** | ❌ Not deployed |

## Prerequisites

- Rust 1.70+
- Solana CLI 3.0+
- Anchor CLI 0.32.1
- Node.js 18+
- pnpm

## Documentation

- [Program Docs](docs/programs/) — Detailed docs for each program
- [Deployment Report](DEPLOYMENT_REPORT.md) — Full deployment details
- [Devnet Status](DEVNET.md) — Current devnet state
- [Stack Overflow Fix](STACK_OVERFLOW_FIX.md) — Trading program optimization

## License

MIT
