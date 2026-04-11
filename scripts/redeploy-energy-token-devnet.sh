#!/usr/bin/env bash
# redeploy-energy-token-devnet.sh
#
# Full redeployment of Energy Token on devnet with metadata initialization
#
# Prerequisites:
#   - solana CLI configured for devnet
#   - anchor CLI installed
#   - pnpm install already run
#
# Usage:
#   bash scripts/redeploy-energy-token-devnet.sh

set -euo pipefail

CLUSTER="devnet"
RPC_URL="https://api.devnet.solana.com"
PROGRAM_ID="B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH"

echo "================================================"
echo "  GridTokenX Energy Token — Devnet Redeploy"
echo "================================================"

# ── Check balance ──────────────────────────────────────────
BALANCE=$(solana balance --url "$RPC_URL" --output json-compact | python3 -c "import sys,json; print(json.load(sys.stdin)['balance'])")
echo ""
echo "Wallet balance: ${BALANCE} SOL"
REQUIRED="3.0"
if python3 -c "exit(0 if float('$BALANCE') >= float('$REQUIRED') else 1)" 2>/dev/null; then
  echo "✅ Balance sufficient (need ≥ ${REQUIRED} SOL)"
else
  echo "❌ Insufficient balance — need at least ${REQUIRED} SOL"
  echo "   Get devnet SOL: https://faucet.solana.com/"
  exit 1
fi

# ── Build ──────────────────────────────────────────────────
echo ""
echo "=== Building Energy Token program ==="
cargo build-sbf --manifest-path programs/energy-token/Cargo.toml 2>&1 | tail -5
echo "✅ Build complete"

# ── Redeploy ───────────────────────────────────────────────
echo ""
echo "=== Redeploying Energy Token program ==="
echo "   Program ID: $PROGRAM_ID"
solana program deploy target/deploy/energy_token.so \
  --program-id target/deploy/energy_token-keypair.json \
  --url "$RPC_URL"

echo "✅ Energy Token redeployed"

# ── Verify ─────────────────────────────────────────────────
echo ""
echo "=== Verifying program ==="
INFO=$(solana program show "$PROGRAM_ID" --url "$RPC_URL" 2>&1)
echo "$INFO"

# ── Run initialization script ─────────────────────────────
echo ""
echo "=== Initializing Energy Token + Metadata ==="
pnpm install --silent 2>/dev/null || true
npx tsx scripts/init-devnet-energy-token.ts

echo ""
echo "================================================"
echo "  ✅ Devnet redeploy complete!"
echo "================================================"
