# GridTokenX — Solana Programs

> GridTokenX turns Thai solar prosumers' surplus electricity into frontier AI computing power — rewarding clean energy contribution with access to Claude and GPT.

## Project Context

This is the **blockchain layer** of the GridTokenX platform — 5 Anchor programs in Rust that power a dual-token economy where solar prosumers earn **GRID** tokens from P2P energy sales, convert to **GRX** utility tokens, swap GRX for stablecoins on a DEX, and burn stablecoins for AI computing credits.

### The Value Chain

```
Rooftop solar → P2P energy trade → GRID token → GRX token → Stablecoin (DEX) → AI credit (burned) → frontier AI access
```

### Who It's For

| User | Role |
|------|------|
| **Prosumers** (primary) | Thai solar panel owners — sell surplus energy, earn AI access |
| **Energy consumers** (secondary) | Buyers who get cheaper, cleaner P2P solar |
| **Institutional** | Built for Thailand's PEA provincial grid, Thai SEC Group 1 compliant |

---

## Token Architecture: GRID vs GRX

The dual-token model deliberately separates the **energy-settlement layer** (GRID) from the **AI-credit layer** (GRX), with a **stablecoin buffer** to absorb GRX price volatility before AI credit redemption. This mirrors Power Ledger's POWR/Sparkz split and Akash Network's AKT/ACT design, while ensuring prosumers always receive predictable AI credit value.

### GRID vs GRX at a Glance

| Attribute | GRID Token | GRX Token |
|-----------|-----------|-----------|
| **Role** | Energy settlement — represents verified solar kWh traded on the P2P marketplace | AI credit access — tradable token redeemable for Claude Code, OpenAI API credits |
| **Issuance model** | Dynamic mint — 1 GRID minted per 1 kWh verified P2P trade | Fixed supply at genesis — 100,000,000 GRX total, never increased |
| **Backing** | 1:1 energy backing (1 GRID = 1 kWh of solar energy traded) | Market price — determined by DEX order book / AMM on Solana |
| **Price** | Platform-internal (1 GRID = 1 kWh traded) | **Floating** — set by market on Solana DEX (order book or AMM) |
| **Blockchain** | Solana (Anchor Framework), permissioned validator set | Solana (Anchor Framework), tradable on Solana DEX |
| **Regulatory class** | Platform-internal accounting unit; not offered publicly | Thai SEC Group 1 utility token (consumptive purpose) — exempt from ICO approval |
| **Transferability** | Transferable within platform between verified prosumers | Tradable on Solana DEX; transferable wallet-to-wallet within platform |
| **Convertibility** | GRID → GRX (one-way swap via platform) | GRX → Stablecoin (DEX swap) → AI Credits (burn); **no GRX → GRID reverse path** |
| **Supply trajectory** | **Inflationary** — grows with P2P energy volume | **Deflationary** — decreases with every AI credit redemption (burn) |
| **Primary holders** | All platform participants (prosumers and consumers) | Prosumers with surplus GRID only |

### The Stablecoin Buffer

GRX has a **floating market price** determined by a Solana DEX (order book or AMM). To ensure prosumers always receive a predictable AI credit value regardless of GRX market fluctuations, the conversion path includes a **stablecoin intermediate step**:

```
GRX → Stablecoin → AI Credits (burned)
```

The stablecoin **absorbs all GRX price volatility**, so the AI credit face value remains stable in fiat terms (e.g., $1.00 USD / 35 THB per credit).

### Settlement: Atomic Clearing → Auto-Swap (Default)

Both the P2P clearing price and the GRX DEX price are dynamic. To eliminate double price risk, the entire conversion chain executes **atomically in a single Solana transaction**:

```
P2P Trade Clears ──→ GRID Minted ──→ GRX Converted ──→ GRX→USDC Swapped ──→ USDC Credited
       (same block, single atomic transaction via CPI calls)
```

| Step | What Happens | Price Source |
|------|-------------|-------------|
| **1. P2P Clearing** | Smart meter records X kWh sold at dynamic clearing price | Order book match |
| **2. GRID Mint** | Registry mints 1 GRID per kWh | Fixed (1:1 with energy) |
| **3. GRID → GRX** | Platform converts GRID to GRX | Oracle reads GRX DEX spot price at clearing |
| **4. GRX → USDC** | Jupiter Aggregator finds best DEX route (Raydium, Orca, etc.) | AMM/order book |
| **5. Credit** | Prosumer receives USDC in their ATA | Guaranteed at clearing-time rate |

**The prosumer never holds GRX by default.** They see: *"You sold 10 kWh at ฿3.00/kWh → ฿30.00 USDC credited."* No GRX price exposure, no temporal risk between clearing and swap.

**Implementation:** The Trading program's `settle_p2p_trade` instruction chains CPI calls to Registry (mint GRID), Energy Token (GRID→GRX), and Jupiter Aggregator (GRX→USDC). All-or-nothing — if any step fails, the entire transaction reverts.

### Optional: Hold GRX (Opt-In)

Prosumers can **opt out** of the auto-swap and receive GRX instead. This lets them:

- **Hold** — If they believe GRX will appreciate (higher future AI credit value)
- **Swap later** — On their own timing, at whatever DEX price prevails

This is an **active choice** — the prosumer must explicitly select "hold GRX" at settlement. The default is instant stablecoin credit.

| Setting | Receives | Price Risk | Use Case |
|---------|----------|-----------|----------|
| **Auto-swap (default)** | USDC | None — locked at clearing time | Prosumers who want predictable AI credit value |
| **Hold GRX (opt-in)** | GRX tokens | Full GRX DEX price exposure | Prosumers who want to speculate on GRX appreciation |

### The Anti-Velocity Mechanism

The **one-way flow** — GRID → GRX → Stablecoin → AI Credits (burned) — is the core anti-velocity mechanism. GRX tokens are swapped to stablecoin on the DEX, then the stablecoin is **permanently burned** upon AI credit redemption, creating continuous deflationary pressure proportional to AI credit demand.

```
                    ┌──────────────────────────────────────────────────────┐
                    │          DUAL-TOKEN FLOW (WITH STABLECOIN BUFFER)     │
                    └──────────────────────────────────────────────────────┘

  P2P Solar        GRID → GRX       GRX → Stablecoin      Stablecoin Burn → AI Credits
  ═══════════      ═══════════      ════════════════      ════════════════════════════

  1 kWh verified ──→ 1 GRID minted ──→ GRID → GRX ──→ GRX → Stablecoin ──→ Stablecoin burned
  on-chain            (inflationary)    (platform swap)   (DEX order book/AMM)  (deflationary)
                                                                                         │
                                                                                         ▼
                                                                             Access to Claude, GPT, Gemini
```

### Economic Implications

1. **Energy market isolation** — GRID price fluctuates with solar supply/demand; GRX floats freely on DEX market dynamics
2. **Stablecoin volatility absorption** — GRX market price swings are absorbed at the DEX swap step; AI credits retain predictable fiat value
3. **Deflationary pressure** — every AI redemption permanently removes stablecoin from circulation (burn), reducing effective supply
4. **Regulatory clarity** — GRID stays internal (no public offering), GRX qualifies as consumptive utility token
5. **No reverse arbitrage** — once stablecoin is burned for AI credits, it cannot be recovered, preventing speculation loops
6. **Price discovery** — GRX market price on DEX reflects real demand for AI compute access, providing transparent valuation signal

---

## Programs

| Program | Purpose |
|---------|---------|
| **Registry** | User identity, smart meter registration, GRID minting via CPI to energy-token |
| **Energy Token** | Dual-token: GRID (1:1 kWh, inflationary) + GRX (100M fixed, deflationary) |
| **Trading** | P2P order matching, continuous double auction, sharded order book |

## Tech Stack

- **Language**: Rust
- **Framework**: Anchor 0.30.1
- **Solana**: 1.18.17
- **Package Manager**: pnpm
- **Testing**: Mocha + Chai (TypeScript)

## Key Commands

```bash
# Install dependencies
pnpm install

# Build all programs
anchor build

# Run all tests
pnpm test:all

# Run individual program tests
pnpm test:oracle
pnpm test:registry
pnpm test:governance

# Deploy to localnet
solana-test-validator --reset &
anchor test
```

## Deployment Status

| Component | Status |
|-----------|--------|
| **Localnet** | ✅ 5/5 deployed & initialized |
| **Devnet** | ⚠️ 4/5 deployed (Trading needs ~4.2 SOL) |
| **Frontend** | ✅ Live at [hackathon.gridtokenx.xyz](https://hackathon.gridtokenx.xyz) |
| **Mainnet** | ❌ Not deployed |

**Frontend Routes:** `/`, `/portfolio`, `/futures`, `/meter`, `/privacy-policy`, `/terms-and-conditions`

## Deployed Program IDs (Devnet)

| Program | Program ID |
|---------|-----------|
| Registry | `C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6` |
| Oracle | `4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9` |
| Governance | `4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5` |
| Energy Token | `B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH` |
| Trading | `5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA` |

## Known Issues

1. **Trading Program Stack Overflow** — Optimized (24% reduction), safe for dev/testing. For production, split `settle_offchain_match` into 2 instructions or upgrade Anchor.
2. **Anchor Version Mismatch** — Crate 0.30.1 vs CLI 0.32.1 (low severity, no functional impact).

## Project Structure

```
├── programs/          # 5 Anchor programs (Rust/Solana)
│   ├── energy-token/  # GRX token management (SPL Token-2022)
│   ├── governance/    # PoA authority, REC certificates
│   ├── oracle/        # Smart meter validation, market clearing
│   ├── registry/      # User identity, meter registration (16 shards)
│   └── trading/       # P2P order matching, double auction
├── scripts/           # Deployment and initialization scripts
├── tests/             # Test suite (TypeScript)
├── docs/              # Program documentation
└── target/deploy/     # Compiled programs + keypairs
```

## Working Notes

- **No `timeout` command** available on this macOS system. Use background processes with `kill` or `sleep` + `kill` patterns instead.
- See `PITCH.md` in the parent directory for the full pitch deck narrative.
- The frontend counterpart lives in `../gridtokenx-hackathon-app`.
