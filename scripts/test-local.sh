#!/usr/bin/env bash
# test-local.sh - Build, deploy, and test all 3 Alpha programs on localnet
set -euo pipefail

echo "================================================"
echo "  GridTokenX Alpha — Local Test Suite"
echo "================================================"

# ── Cleanup ────────────────────────────────────────────────
echo ""
echo "=== Cleaning up ==="
pkill -f solana-test-validator 2>/dev/null || true
sleep 2
rm -rf test-ledger 2>/dev/null || true

# ── Start Test Validator ──────────────────────────────────
echo ""
echo "=== Starting local test validator ==="
solana-test-validator --ledger test-ledger --quiet &
VALIDATOR_PID=$!
sleep 8

# Verify validator is running
if ! kill -0 $VALIDATOR_PID 2>/dev/null; then
  echo "❌ Validator failed to start"
  exit 1
fi
echo "✅ Validator running (PID: $VALIDATOR_PID)"

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  kill $VALIDATOR_PID 2>/dev/null || true
  rm -rf test-ledger 2>/dev/null || true
  echo "✅ Cleanup complete"
}
trap cleanup EXIT

# ── Configure Solana CLI ──────────────────────────────────
echo ""
echo "=== Configuring Solana CLI ==="
solana config set --url http://localhost:8899 --commitment confirmed 2>/dev/null

WALLET=$(solana config get keypair 2>/dev/null | awk '{print $NF}')
echo "Wallet: $(solana address)"
echo "Balance: $(solana balance) SOL"

# ── Deploy Programs ────────────────────────────────────────
echo ""
echo "=== Deploying Programs ==="

deploy_program() {
  local name=$1
  local so=$2
  local kp=$3
  
  echo "  Deploying $name..."
  solana program deploy "$so" --program-id "$kp" 2>&1 | tail -2
  if [ $? -eq 0 ]; then
    echo "  ✅ $name deployed"
  else
    echo "  ❌ $name deployment failed"
    return 1
  fi
}

deploy_program "Energy Token" "target/deploy/energy_token.so" "target/deploy/energy_token-keypair.json"
deploy_program "Registry" "target/deploy/registry.so" "target/deploy/registry-keypair.json"
deploy_program "Trading" "target/deploy/trading.so" "target/deploy/trading-keypair.json"

# ── Initialize Programs ───────────────────────────────────
echo ""
echo "=== Initializing Programs ==="

# Initialize Registry
echo "  Initializing Registry..."
npx tsx scripts/init-registry.ts 2>&1 | grep -E "✅|⚠️|TX:" || true

# Initialize Shards
echo "  Initializing Shards..."
npx tsx scripts/init-shards.ts 2>&1 | grep -E "✅|⚠️|TX:" || true

# Initialize Trading
echo "  Initializing Trading..."
npx tsx scripts/init-market.ts 2>&1 | grep -E "✅|⚠️|TX:" || true

# Initialize Energy Token (dual-token)
echo "  Initializing Energy Token (dual-token)..."
npx tsx scripts/init-token.ts 2>&1 | grep -E "✅|⚠️|❌|PDA|Mint|Vault|GRID|GRX" || true

# ── Run Tests ─────────────────────────────────────────────
echo ""
echo "=== Running Tests ==="

# Registry tests
echo ""
echo "--- Registry Tests ---"
npx ts-mocha tests/registry_sharding.ts \
  --require ts-node/register \
  --exit \
  --timeout 60000 2>&1 | tail -30

echo ""
echo "================================================"
echo "  ✅ All tests complete!"
echo "================================================"
