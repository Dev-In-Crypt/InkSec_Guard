# InkSec Guard

**Real-time transaction simulation and risk-scoring for ERC-4337 wallets on Ink Chain.**

[![Ink Sepolia](https://img.shields.io/badge/network-Ink%20Sepolia-6366f1)](https://explorer-sepolia.inkonchain.com)
[![ERC-4337](https://img.shields.io/badge/standard-ERC--4337-8b5cf6)](https://eips.ethereum.org/EIPS/eip-4337)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Problem

Retail users onboarding to DeFi via Kraken's Ink Chain face invisible threats:
unlimited token approvals, drainer contracts, and phishing sites. They sign
transactions without understanding what they're authorising.

## Solution

InkSec Guard intercepts every `UserOperation` before it hits the mempool,
simulates its state changes, scores 7 risk patterns, and shows a human-readable
warning — in real time, before the user signs.

A second layer of protection is provided by the **ERC-4337 Validating Paymaster**,
which refuses to sponsor gas for transactions targeting blacklisted contracts.

---

## Architecture

```
User
 │
 ▼
Next.js Frontend  ──POST /api/v1/simulate──►  Node.js API
 │                                               │
 │  ◄──── SimulationResult + RiskScore ─────────┤
 │                                               ├─► eth_call (Ink Sepolia RPC)
 │                                               ├─► on-chain reads (balances, allowances)
 │                                               └─► Blockscout API (verification check)
 │
 ▼ (if user proceeds)
ZeroDev AA Wallet ──UserOp──► EntryPoint ──► InkSecPaymaster
                                               │
                                               └─► blacklist check → accept / revert
```

---

## Live Demo

- **Frontend:** _deploy to Vercel — see Deployment section_
- **Backend API:** _deploy to Railway — see Deployment section_

---

## Quick Start

```bash
git clone <repo>
cd inksec-guard

# 1. Copy env files
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
# Fill in DEPLOYER_PRIVATE_KEY, TEST_WALLET, ZERODEV_PROJECT_ID, etc.

# 2. Install dependencies
npm install              # root workspaces
cd frontend && npm install

# 3. Run backend (dev)
npm run dev:backend      # starts on :3001

# 4. Run frontend (dev)
npm run dev:frontend     # starts on :3000
```

---

## API Reference

### `POST /api/v1/simulate`

Simulate a transaction and receive a risk assessment.

**Request:**
```json
{
  "from":  "0x...",
  "to":    "0x...",
  "data":  "0x095ea7b3...",
  "value": "0"
}
```

**Response:**
```json
{
  "simulation": {
    "success": true,
    "balanceChanges":  [...],
    "approvalChanges": [{ "token": "0x...", "spender": "0x...", "oldAllowance": "0", "newAllowance": "UNLIMITED" }],
    "decodedFunction": "approve(0xDead…, UNLIMITED)",
    "warnings": ["Unlimited tUSDC approval granted to 0xDead…"]
  },
  "risk": {
    "score": 92,
    "level": "critical",
    "reasons": ["Target address is in the malicious registry (DrainerMock).", "Unlimited token approval granted…"],
    "recommendation": "DO NOT SIGN"
  },
  "humanReadable": "Transaction: approve(…). Target: 0x…. Risk Score: 92%. DO NOT SIGN. Target address is in the malicious registry."
}
```

### `GET /api/v1/health`

```json
{ "status": "ok", "chain": "ink-sepolia", "blockNumber": "12345678" }
```

---

## Smart Contracts (Ink Sepolia)

| Contract | Address |
|----------|---------|
| MockERC20 (tUSDC) | `0x641822A13272b91af7D64245871523fD402156d6` |
| DrainerMock | `0x3Abb24f9016212f997767d8b85feCA98913a5933` |
| InkSecPaymaster | `0xA0c90BDd4578Bc4955Ff3350059837760af1fCEA` |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

---

## Testing

```bash
# Solidity contracts (Foundry)
npm run test:contracts    # 28 tests

# Backend (Vitest)
cd backend && npx vitest run   # 37 tests

# All tests
npm run test:all
```

**Current coverage:**
- 28 Solidity tests (MockERC20, DrainerMock, InkSecPaymaster)
- 37 TypeScript tests (decoder, simulator, riskScorer, REST API)

---

## Deployment

### Contracts → Ink Sepolia
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url $INK_SEPOLIA_RPC \
  --broadcast \
  --verify \
  --verifier blockscout \
  --verifier-url https://explorer-sepolia.inkonchain.com/api/
```

After deploy, update `contracts/deployments/ink-sepolia.json` and
`backend/src/data/maliciousAddresses.json` with the real DrainerMock address.

### Backend → Railway

1. Connect GitHub repo to [Railway](https://railway.app)
2. Set env vars: `INK_SEPOLIA_RPC`, `PORT=3001`
3. Root directory: `backend/`
4. Deploy — Railway uses `railway.toml` start command automatically

### Frontend → Vercel

1. Connect GitHub repo to [Vercel](https://vercel.com)
2. Root directory: `frontend/`
3. Set env vars from `frontend/.env.local.example`
4. Deploy

---

## Roadmap (Spark → Forge)

| Milestone | Description |
|-----------|-------------|
| Mainnet | Deploy all contracts to Ink Mainnet (chain ID 57073) |
| SDK | `@inksec/guard-sdk` npm package with `simulateAndWarn(userOp)` one-liner |
| Registry | On-chain community-curated malicious address registry with staking |
| Integrations | Partner with 1–2 Ink ecosystem wallets |
| Superchain | Extend to Base, Optimism, Zora |

---

## Grant Alignment

InkSec Guard is built for the **Ink Builder Program — Spark Track**.
It directly protects Kraken's retail users onboarding via smart wallets,
filling a critical security gap in the Ink ecosystem.
Safe users = higher TVL = stronger ecosystem.
