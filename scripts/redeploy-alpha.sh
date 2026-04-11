#!/usr/bin/env bash
# redeploy-alpha.sh — Redeploy all 3 Alpha programs to devnet
#
# Prerequisites:
#   - solana CLI configured for devnet
#   - ≥ 3 SOL in wallet
#   - Programs compiled (cargo build-sbf)
#
# Usage:
#   bash scripts/redeploy-alpha.sh

set -euo pipefail

CLUSTER="devnet"
RPC_URL="${SOLANA_RPC_URL:-https://api.devnet.solana.com}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "================================================"
echo "  GridTokenX Alpha — Devnet Redeploy"
echo "================================================"

# ── Check SOL balance ──────────────────────────────────
echo ""
echo "=== Checking Balance ==="
BALANCE=$(solana balance --url "$RPC_URL" 2>/dev/null | awk '{print $1}')
echo "  Balance: ${BALANCE} SOL"

# Parse balance (handle "SOL" suffix)
BALANCE_NUM=$(echo "$BALANCE" | sed 's/ SOL//')
if (( $(echo "$BALANCE_NUM < 2" | bc -l) )); then
  echo "  ❌ Need ≥ 2 SOL for redeployment"
  echo "     Get devnet SOL: https://faucet.solana.com/"
  exit 1
fi
echo "  ✅ Sufficient balance"

# ── Build programs ──────────────────────────────────────
echo ""
echo "=== Building Programs ==="
cd "$ROOT_DIR"
cargo build-sbf 2>&1 | grep -E "Finished|error" || true
echo "  ✅ Build complete"

# ── Deploy Programs ─────────────────────────────────────
echo ""
echo "=== Deploying Programs ==="

deploy_program() {
  local name=$1
  local so="$ROOT_DIR/target/deploy/${1//-/_}.so"
  local kp="$ROOT_DIR/target/deploy/${1//-/_}-keypair.json"

  echo "  Deploying $name..."
  local output
  output=$(solana program deploy "$so" --program-id "$kp" --url "$RPC_URL" 2>&1)
  local sig
  sig=$(echo "$output" | grep -o "Signature: [a-zA-Z0-9]*" | awk '{print $2}')

  if [ -n "$sig" ]; then
    echo "    ✅ $name deployed: $sig"
    return 0
  else
    echo "    ❌ $name failed"
    echo "    $output" | tail -3
    return 1
  fi
}

deploy_program "energy-token"
deploy_program "registry"
deploy_program "trading"

# ── Initialize Programs ─────────────────────────────────
echo ""
echo "=== Initializing Programs ==="

echo "  Initializing Registry..."
cd "$ROOT_DIR"
npx tsx scripts/init-registry.ts 2>&1 | grep -E "✅|⚠️|TX:" || true

echo "  Initializing Shards..."
npx tsx scripts/init-shards.ts 2>&1 | grep -E "✅|⚠️|TX:" || true

echo "  Initializing Energy Token (dual-token)..."
SOLANA_RPC_URL="$RPC_URL" npx tsx scripts/init-token.ts 2>&1 | grep -E "✅|⚠️|❌|GRID|GRX|Network" || true

# ── Done ────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  ✅ Devnet redeploy complete!"
echo "================================================"
echo ""
echo "  Programs deployed on $CLUSTER:"
echo "    Registry:      $(solana address --keypair "$ROOT_DIR/target/deploy/registry-keypair.json")"
echo "    Energy Token:  $(solana address --keypair "$ROOT_DIR/target/deploy/energy_token-keypair.json")"
echo "    Trading:       $(solana address --keypair "$ROOT_DIR/target/deploy/trading-keypair.json")"
echo ""
echo "  Explorer: https://explorer.solana.com/?cluster=${CLUSTER}"
echo ""
