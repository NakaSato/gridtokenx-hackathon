# GridTokenX — Pitch Deck Narrative

## One-Sentence Pitch

> GridTokenX turns Thai solar prosumers' surplus electricity into frontier AI computing power — rewarding clean energy contribution with access to Claude and GPT.

---

## Problem

### Solar Prosumers Are Paid Pennies for Their Surplus Energy

Thailand has over **3,000 MW** of installed solar capacity, mostly rooftop systems owned by households, farms, and small businesses. These prosumers (producer-consumers) generate surplus energy they can't fully use.

When they sell it back, they receive a **feed-in tariff** — typically ฿2–3 per kWh. That's retail electricity prices at best, wholesale at worst. Their clean energy contribution is priced as a commodity, not a resource.

### AI Compute Is Expensive and Out of Reach

Meanwhile, access to frontier AI models (Claude, GPT-4/5, Gemini) costs hundreds of dollars per month in API credits — far beyond what individual users, small businesses, or rural communities can afford.

**Two misaligned markets:** clean energy undervalued at the edge, AI compute concentrated and expensive at the center.

---

## Solution

### A Single, Verifiable Value Chain

GridTokenX connects these two markets through a **dual-token economy** with a stablecoin buffer that flows end-to-end:

```
Rooftop solar → P2P energy trade → GRID token → GRX token → Stablecoin (DEX) → AI credit (burned) → frontier AI access
```

### How It Works

| Step | What Happens | Token Flow |
|------|-------------|------------|
| **1. Generate** | Solar panels produce surplus energy | Smart meter records kWh on-chain |
| **2. Trade** | Prosumer sells surplus P2P to neighbors at better-than-feed-in rates | Earns **GRID** tokens (Thai SEC Group 1 compliant utility token) |
| **3. Convert** | GRID tokens converted to **GRX** utility tokens | 1 GRID → GRX (one-way swap at platform) |
| **4. Auto-Swap** | GRX swapped for stablecoin via Jupiter Aggregator (atomic, same tx) | GRX price floats; stablecoin absorbs volatility — **prosumer never holds GRX by default** |
| **5. Redeem** | Stablecoin burned for AI computing credits | Access to Claude Code, OpenAI API, Gemini |
| **6. Access** | Frontier AI tools unlocked | Clean energy → intelligence |

### Settlement: Atomic Clearing

Both the P2P clearing price and GRX DEX price are dynamic. To eliminate double price risk, **the entire conversion chain executes atomically in one Solana transaction**:

```
P2P Clearing ──→ GRID Mint ──→ GRX Convert ──→ GRX→USDC Swap ──→ USDC Credited
       (same block, all-or-nothing via CPI calls)
```

Prosumers see: *"You sold 10 kWh at ฿3.00/kWh → ฿30.00 USDC credited."* No GRX price exposure.

**Optional: hold GRX** — prosumers can opt-in to receive GRX instead of USDC if they want to speculate on GRX appreciation.

### The Flywheel

- **More solar** → more surplus → more P2P trades → more GRID earned → more GRX minted → more DEX swaps → more stablecoin burned → higher token demand → more solar investment
- **Energy consumers** get cheaper solar than retail grid rates
- **AI compute providers** get a new, verifiable clean-energy-backed demand channel
- **Stablecoin buffer** ensures AI credit value stays predictable regardless of GRX market fluctuations

---

## Who It's For

### Primary Users — Solar Prosumers

- Households, farms, and small businesses with rooftop solar in Thailand
- Generate surplus energy they can't fully consume
- Want better returns than feed-in tariffs
- Want access to AI tools that are currently too expensive

### Secondary Users — Energy Consumers

- Businesses and households buying electricity
- Want cheaper, cleaner peer-to-peer solar instead of full retail grid rates
- Participate in the same trading platform

### Institutional Alignment

- **PEA (Provincial Electricity Authority)** — designed for Thailand's provincial distribution network, operates on existing grid infrastructure
- **Thai SEC Group 1 Utility Token** — regulatory-compliant token design, built for approval from the Securities and Exchange Commission
- **Clean energy policy** — aligns with Thailand's renewable energy targets and carbon reduction commitments

---

## Why Now

| Trend | Relevance |
|-------|-----------|
| **Solar adoption** | Thailand's rooftop solar installations growing 20%+ YoY; prosumer base expanding rapidly |
| **AI compute demand** | Frontier model usage (Claude, GPT) exploding; API credit costs prohibitive for individuals |
| **Regulatory clarity** | Thai SEC utility token framework provides clear compliance path for Group 1 tokens |
| **PEA infrastructure** | Existing provincial grid can support P2P trading without new hardware |
| **Blockchain maturity** | Solana provides the throughput, low fees, and program composability needed for real-time energy markets |

---

## Why Us

| Advantage | Detail |
|-----------|--------|
| **Built on existing infrastructure** | No new grid hardware needed — operates on PEA's provincial distribution network |
| **Compliant by design** | GRID token structured as Thai SEC Group 1 utility token from day one |
| **Single verifiable value chain** | Every kWh → token → stablecoin → AI credit is auditable on-chain |
| **Atomic settlement** | Entire conversion chain runs in one tx — prosumers never face double price risk |
| **Stablecoin buffer** | GRX floats on DEX; stablecoin absorbs volatility so AI credit value stays predictable for prosumers |
| **5 deployed Solana programs** | Registry, Oracle, Governance, Energy Token, Trading — all live on localnet, 4/5 on devnet |
| **Full-stack platform** | Not just smart contracts — complete Next.js trading platform with Mapbox grid visualization, ZK privacy, futures, auctions, and carbon credits |
| **Closed-loop economics** | Energy creates AI access, AI access drives energy demand — self-reinforcing flywheel with deflationary burn |

---

## The One-Sentence Pitch (Reprise)

> GridTokenX turns Thai solar prosumers' surplus electricity into frontier AI computing power — rewarding clean energy contribution with access to Claude and GPT.

---

**Built by:** GridTokenX Team  
**Stack:** Solana (5 Anchor programs) + Next.js 16 + Pyth Network + Mapbox + WASM  
**Status:** 5/5 programs on localnet, 4/5 on devnet · Frontend live at [hackathon.gridtokenx.xyz](https://hackathon.gridtokenx.xyz)  
**Frontend:** Dark-purple theme · Poppins font · Routes: /, /portfolio, /futures, /meter  
**Regulatory:** Thai SEC Group 1 utility token design, PEA-aligned infrastructure
