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

- **Frontend:** https://frontend-production-ec44.up.railway.app
- **Backend API:** https://backend-production-916d.up.railway.app/api/v1/health

---

## On-Chain Activity (Ink Sepolia)

16 real transactions from 10 unique smart accounts, generated via ZeroDev ERC-4337 with gasless paymaster sponsorship.

| # | Smart Account | Operation | Risk | Tx |
|---|---------------|-----------|------|----|
| 1 | `0x5cD5c2bB…` | approve(safe, 1000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0x85c4503d78cbc60ac9114fc6df1185a42989376b5e4773d52a1acedbecc1ba06) |
| 2 | `0x5cD5c2bB…` | approve(drainer, UNLIMITED) | 🚨 Critical | [view](https://explorer-sepolia.inkonchain.com/tx/0x933b524d020f1f7b42dfd8aeb810794d20d4b796f864489552b772cd07ebb889) |
| 3 | `0x71861c2E…` | approve(safe, 500 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0x3ddd30a43615dd908265727758b72b136a62ed1df162520327d88be6cafc1315) |
| 4 | `0x70158D5D…` | approve(safe, 1000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xfed8e329cec4d068a95c7d37b97cb074b743b1228800f8594b6cd1f1c3f99db4) |
| 5 | `0x9a0445B6…` | approve(safe, 500 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0x03f452f48b0aad9ddf7f4ba2e7372fc94a6579264cc2891430fcfc370ed15f56) |
| 6 | `0x6B111bE8…` | approve(safe, 1000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xedc67fd4f40d9daa01ba243389bef4bb2287e8926e21099d0adcd5e60a72138e) |
| 7 | `0x6B111bE8…` | approve(drainer, UNLIMITED) | 🚨 Critical | [view](https://explorer-sepolia.inkonchain.com/tx/0x43d8a9ae9d839a32fd243dbd4d74aa5d10280401fe2e45aa77d242641bb2dded) |
| 8 | `0xF64a5A1f…` | approve(safe, 250 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0x4bcab43272c1096801326b24a44b3d5ee6515cc8026fdcf3bb7538d1fc544f22) |
| 9 | `0xF64a5A1f…` | approve(drainer, UNLIMITED) | 🚨 Critical | [view](https://explorer-sepolia.inkonchain.com/tx/0xa1377a9a9a15af1d42ce08cb7cef86386349e5e7217ba98bba7a7a9392d1b51d) |
| 10 | `0xf35EE732…` | approve(safe, 750 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xf66470d0dba5d5a41a9db6d7dc23c6497cee67a162e45129f0164030a680b32f) |
| 11 | `0xf35EE732…` | approve(safe, 2000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xb7bc37230aed72878e0d07243d3da01857fa0b1746e7d3a0ce7a37242dc9e7ff) |
| 12 | `0x711d980b…` | approve(drainer, UNLIMITED) | 🚨 Critical | [view](https://explorer-sepolia.inkonchain.com/tx/0xa2c603984c8d2856fb38eac8e2e343feeec997e55832f2f82a0f031448418e00) |
| 13 | `0x711d980b…` | approve(safe, 100 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xbe345ea388c1abc68449e779646182357f2096fa8cd3d6a3b02762aec61055fd) |
| 14 | `0x9995E353…` | approve(safe, 5000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xd21888f514e5c9f9f056aae60b7def5b929b72546eab95ec2db481e8a126c019) |
| 15 | `0x299Dee40…` | approve(safe, 1500 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0x9b4dfd778f402ea6ad47dd1e18df31780a157eaa6bf76a54edc7fc9d19c5a238) |
| 16 | `0x299Dee40…` | approve(safe, 3000 tUSDC) | ✅ Safe | [view](https://explorer-sepolia.inkonchain.com/tx/0xed7920e1e4930ae93ae6dcec7e8cfb615abe5458ed4dd471b7b90785726f0327) |

**Summary:** 16 txs · 10 unique smart accounts · 12 safe · 4 critical (intercepted by InkSec Guard) · all gas sponsored by ZeroDev paymaster

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
