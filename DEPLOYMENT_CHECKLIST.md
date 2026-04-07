# GridTokenX Deployment Checklist

This checklist ensures a smooth and secure deployment of the GridTokenX platform.

## Pre-Deployment

### 1. Environment Setup
- [ ] Install required dependencies: `pnpm install`
- [ ] Verify Solana CLI is installed and configured: `solana --version`
- [ ] Verify Anchor CLI is installed: `anchor --version`
- [ ] Configure Solana CLI for target cluster: `solana config set --url <cluster-url>`
- [ ] Verify deployment wallet has sufficient SOL: `solana balance`

### 2. Configuration Review
- [ ] Update `.env` file with production values (copy from `.env.example`)
- [ ] Verify program IDs in `Anchor.toml` match deployment targets
- [ ] Update `ANCHOR_WALLET` path to deployment wallet
- [ ] Review tokenization configuration (ratios, decimals, etc.)
- [ ] Verify cluster endpoint is correct

### 3. Security Checks
- [ ] Ensure no private keys are committed to version control
- [ ] Verify `.env` file is in `.gitignore`
- [ ] Review all program authorities and multisig configurations
- [ ] Check that test/dev keypairs are not used in production
- [ ] Validate access control settings for each program

### 4. Build Programs
```bash
# Build all programs
anchor build

# Verify build succeeded
ls -la target/deploy/
```

### 5. Run Test Suite
```bash
# Run all tests locally first
anchor test

# Or run specific test suites
pnpm test:all
```

## Deployment

### 6. Deploy Programs
```bash
# Option 1: Use automated deployment script
pnpm deploy:prod

# Option 2: Manual deployment
anchor deploy
```

### 7. Verify Deployment
- [ ] Check all programs deployed successfully
- [ ] Verify program IDs match expected addresses
- [ ] Confirm deployment transaction signatures

### 8. Initialize Programs
```bash
# Initialize Registry
anchor run init-registry

# Initialize Registry Shards
anchor run init-shards

# Initialize Oracle
anchor run init-oracle

# Initialize Market
anchor run init-market

# Initialize Governance
anchor run init-governance

# Initialize PoA
anchor run init-poa

# Initialize Zone Markets
anchor run init-zone-market

# Initialize Sharding
anchor run init-sharding

# Setup Address Lookup Tables (ALTs)
anchor run setup-alts
```

## Post-Deployment

### 9. Verify Initialization
- [ ] Confirm Registry initialized correctly
- [ ] Verify all 16 Registry Shards created
- [ ] Check Oracle price feeds are active
- [ ] Validate Governance parameters set
- [ ] Confirm Market configurations

### 10. Integration Testing
```bash
# Run integration tests against deployed cluster
# Update test endpoints to production cluster
anchor test --provider.cluster <cluster-url>
```

### 11. Monitoring Setup
- [ ] Set up transaction monitoring
- [ ] Configure alerts for program errors
- [ ] Set up performance monitoring
- [ ] Monitor program upgrade authority

### 12. Documentation
- [ ] Record deployed program IDs
- [ ] Document initialization parameters
- [ ] Update API documentation
- [ ] Record deployment date and version
- [ ] Save deployment transaction signatures

## Production Hardening

### 13. Security Hardening
- [ ] Transfer program authorities to multisig
- [ ] Enable freeze authority if applicable
- [ ] Set up emergency pause mechanisms
- [ ] Configure rate limiting if needed
- [ ] Review and restrict mint authorities

### 14. Backup and Recovery
- [ ] Backup all keypairs securely
- [ ] Document recovery procedures
- [ ] Test upgrade procedures
- [ ] Create rollback plan

### 15. Performance Validation
```bash
# Run performance benchmarks
pnpm test:performance

# Monitor TPS and latency
# Validate against expected metrics from README
```

## Quick Deployment Commands

### Local Development
```bash
pnpm install
anchor build
anchor test
```

### Production Deployment
```bash
# 1. Install dependencies
pnpm install

# 2. Build programs
anchor build

# 3. Deploy and initialize
pnpm deploy:prod
```

### Verify Deployment
```bash
# Check program deployments
solana program show <program-id>

# Verify account states
solana account <account-id>
```

## Troubleshooting

### Common Issues

**Build Failures:**
- Ensure Rust toolchain is up to date
- Check `Cargo.toml` dependencies
- Run `cargo clean` and rebuild

**Deployment Failures:**
- Verify sufficient SOL in deployment wallet
- Check cluster is accessible
- Validate program IDs match `Anchor.toml`

**Initialization Failures:**
- Review program logs: `solana logs <program-id>`
- Verify accounts exist and are funded
- Check authority configurations

## Program IDs Reference

| Program | Address |
|---------|---------|
| Energy Token | `n52aKuZwUeZAocpWqRZAJR4xFhQqAvaRE7Xepy2JBGk` |
| Governance | `DamT9e1VqbA5nSyFZHExKwQu6qs4L5FW6dirWCK8YLd4` |
| Oracle | `JDUVXMkeGi4oxLp8njBaGScAFaVBBg7iGoiqcY1LxKop` |
| Registry | `FmvDiFUWPrwXsqo7z7XnVniKbZDcz32U5HSDVwPug89c` |
| Trading | `69dGpKu9a8EZiZ7orgfTH6CoGj9DeQHHkHBF2exSr8na` |

## Support

- Documentation: `docs/` directory
- Performance Papers: `docs/academic/`
- Issue Tracking: Project repository
- Community: GridTokenX Discord/Telegram

---

**Deployment Version:** 0.1.3  
**Last Updated:** 2026-04-07
