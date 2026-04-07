# GridTokenX Quick Reference Card

## 📍 Deployed Program IDs

```
Energy Token: B9LnEVqqz8ZVgZ4zELtxXYozXQbm1eo1KD2x3rAMMcTH
Governance:   4H7HQ3aRdXkGhAxvAyLKY37c8BS1Do8zjLdR5mRAcVn5
Oracle:       4zfVZ9KkgxvYbkdGwN46b7XW7PL9wFahUwGaJp18dBX9
Registry:     C5HLtbZHgwVU2oMirgd9f62Zeig7hZFKyJuB9AqVcsn6
Trading:      5e8URdeycFDUZL33HYhhEMY928BJCTPn4xAnhJhKb3SA
```

## 🚀 Quick Commands

### Start
```bash
pnpm install              # Install dependencies
anchor test               # Run tests
```

### Initialize
```bash
anchor run init-registry
anchor run init-shards
anchor run init-oracle
anchor run init-market
anchor run init-governance
anchor run init-zone-market
```

### Test
```bash
anchor test               # All tests
pnpm test:all            # LiteSVM tests
anchor test tests/oracle.ts  # Single test
```

### Build & Deploy (if needed)
```bash
anchor build             # Rebuild all programs
anchor deploy            # Deploy to cluster
```

## 🔗 Network Info

```
Cluster:     localnet
RPC URL:     http://127.0.0.1:8899
WebSocket:   ws://127.0.0.1:8900
Wallet:      ~/.config/solana/id.json
```

## 📚 Documentation

- **Main README:** `README.md`
- **Program Docs:** `docs/programs/README.md`
- **Deployment:** `DEPLOYMENT_SUMMARY.md`
- **Checklist:** `DEPLOYMENT_CHECKLIST.md`
- **Status:** `STATUS.md`

## ⚠️ Known Issues

- **Trading Program:** Stack overflow warning (functional for testing)
- **Anchor Version:** 0.30.1 crates / 0.32.1 CLI (aligned in config)

## ✅ Current Status

**All programs deployed and ready for testing** 🎉

---
**Version:** 0.1.3 | **Updated:** April 7, 2026
