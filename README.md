# GridTokenX

> GridTokenX turns Thai solar prosumers' surplus electricity into frontier AI computing power — rewarding clean energy contribution with access to Claude and GPT.

Decentralized peer-to-peer energy trading on Solana with a dual-token economy and stablecoin buffer.

## The Value Chain

```
Rooftop solar → P2P energy trade → GRID token → GRX token → Stablecoin (DEX) → AI credit (burned) → frontier AI access
```

Solar prosumers earn **GRID** tokens by selling surplus energy peer-to-peer, convert them to **GRX** utility tokens, swap GRX for stablecoins on a Solana DEX, and burn stablecoins for AI computing credits — accessing Claude, GPT, and other frontier models.

## Token Architecture: GRID vs GRX

The dual-token model separates the **energy-settlement layer** (GRID) from the **AI-credit layer** (GRX), with a **stablecoin buffer** to absorb GRX price volatility so AI credit value stays predictable.

| Attribute | GRID Token | GRX Token |
|-----------|-----------|-----------|
| **Role** | Energy settlement (1 GRID = 1 kWh P2P solar) | AI credit access (tradable, DEX-priced) |
| **Issuance** | Dynamic — 1 GRID minted per 1 kWh verified P2P trade | Fixed — 100,000,000 total at genesis, never increased |
| **Backing** | 1:1 energy backing | Market price — determined by Solana DEX order book / AMM |
| **Price** | Platform-internal | **Floating** — set by DEX market |
| **Supply** | **Inflationary** — grows with energy volume | **Deflationary** — burned on every AI redemption |
| **Regulatory** | Platform-internal accounting unit | Thai SEC Group 1 utility token (consumptive) |
| **Transfer** | Within platform, verified prosumers only | Tradable on Solana DEX |
| **Convert** | GRID → GRX (one-way swap) | GRX → Stablecoin (DEX) → AI Credits (burn; **no reverse**) |

### The Stablecoin Buffer

GRX has a **floating market price** on a Solana DEX. The stablecoin intermediate step absorbs all GRX volatility, ensuring AI credits retain a predictable fiat value (e.g., $1.00 / 35 THB per credit).

### Atomic Clearing → Auto-Swap (Default)

Both the P2P clearing price and GRX DEX price are dynamic. To eliminate double price risk, the entire conversion chain executes **atomically in one Solana transaction**:

```
P2P Trade Clears ──→ GRID Minted ──→ GRX Converted ──→ GRX→USDC Swapped ──→ USDC Credited
       (same block, atomic via CPI)
```

**Prosumers never hold GRX by default** — they receive USDC instantly at the clearing-time rate. No GRX price exposure, no temporal risk.

### Optional: Hold GRX (Opt-In)

Prosumers can select "hold GRX" at settlement to receive GRX tokens instead of USDC — useful if they believe GRX will appreciate. This is an **active opt-in choice**; the default is instant stablecoin credit.

| Setting | Receives | Price Risk |
|---------|----------|-----------|
| **Auto-swap (default)** | USDC | None — locked at clearing time |
| **Hold GRX (opt-in)** | GRX tokens | Full GRX DEX price exposure |

### The Anti-Velocity Mechanism

The **one-way flow** — GRID → GRX → Stablecoin → AI Credits (burned) — means stablecoins are permanently destroyed upon redemption, creating continuous deflationary pressure proportional to AI credit demand.

```
P2P Solar        GRID → GRX       GRX → Stablecoin     Stablecoin Burn → AI Credits
═══════════      ═══════════      ════════════════     ════════════════════════════

1 kWh verified ──→ 1 GRID minted ──→ GRID → GRX ──→ GRX → Stablecoin ──→ Stablecoin burned
on-chain           (inflationary)    (platform swap)   (DEX order book/AMM)  (deflationary)
                                                                                        │
                                                                                        ▼
                                                                            Access to Claude, GPT, Gemini
```

## Who It's For

| User | Role |
|------|------|
| **Prosumers** (primary) | Solar panel owners who sell surplus energy and earn AI access |
| **Energy consumers** (secondary) | Buyers who get cheaper, cleaner P2P solar |
| **Institutional** | Built for Thailand's PEA provincial grid, Thai SEC Group 1 compliant |

## Programs

| Program | Description |
|---------|-------------|
| **Registry** | User identity, smart meter registration, GRID minting via CPI to energy-token |
| **Energy Token** | Dual-token: GRID (1:1 kWh, inflationary) + GRX (100M fixed, deflationary) |
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

## Deployed Program IDs (Devnet) — Alpha

| Program | Program ID | Status |
|---------|-----------|--------|
| Registry | `C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6` | ✅ Deployed |
| Energy Token | `B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH` | ⚠️ Needs redeploy (dual-token refactor) |
| Trading | `5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA` | ⚠️ Needs redeploy (governance decoupled) |

> **Oracle** and **Governance** programs removed in Alpha phase. Reintroduced in Beta/Production.

Verify on [Solana Explorer (Devnet)](https://explorer.solana.com/address/C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6?cluster=devnet).

## Current Status

| Component | Status |
|-----------|--------|
| **Localnet** | ✅ 3/3 programs compile, ready for deploy |
| **Devnet** | ⚠️ Needs redeploy (dual-token refactor + governance decoupling) |
| **Frontend** | ✅ Live at [hackathon.gridtokenx.xyz](https://hackathon.gridtokenx.xyz) |
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
