# InkSec Guard — Architecture

## Overview

InkSec Guard is a two-layer security system for ERC-4337 (Account Abstraction) wallets on Ink Chain. Layer 1 is an off-chain simulation API that intercepts transactions before signing. Layer 2 is an on-chain Validating Paymaster that refuses to sponsor gas for blacklisted contracts.

```
User initiates transaction
         │
         ▼
┌─────────────────────┐
│   Next.js Frontend  │  ← AA wallet via ZeroDev SDK
└─────────┬───────────┘
          │  POST /api/v1/simulate
          ▼
┌─────────────────────┐
│  Node.js Backend    │
│  ─────────────────  │
│  1. Decoder         │  ← decodeCalldata(data) → human-readable
│  2. Simulator       │  ← eth_call → state diffs
│  3. RiskScorer      │  ← 7 rules → score 0–100
└─────────┬───────────┘
          │  viem publicClient
          ▼
┌─────────────────────┐
│  Ink Sepolia RPC    │  ← balanceOf, allowance, bytecode, block
│  + Blockscout API   │  ← contract verification check
└─────────────────────┘
          │
          │  SimulationResult + RiskScore
          ▼
┌─────────────────────┐
│  Frontend renders   │
│  RiskAlert          │  ← color-coded by level: safe/caution/danger/critical
│  SimulationResult   │  ← balance changes table, approval changes
└─────────┬───────────┘
          │  if user proceeds
          ▼
┌─────────────────────┐
│  ZeroDev Bundler    │
│  (UserOperation)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  EntryPoint v0.7    │  0x0000000071727De22E5E9d8BAf0edAc6f37da032
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ InkSecPaymaster     │  ← LAYER 2: on-chain blacklist check
│  (Ink Sepolia)      │     if blacklisted → revert, no gas sponsorship
└─────────────────────┘
```

---

## Components

### 1. Smart Contracts (`contracts/`)

#### MockERC20 (`src/MockERC20.sol`)
Test ERC-20 token used for the demo ("InkSec Test USDC", tUSDC, 6 decimals). Includes a public `mint()` for testnet seeding.

**Security:** custom errors, zero-address guards on mint/approve/transfer, no admin privileges.

#### DrainerMock (`src/DrainerMock.sol`)
Simulates a phishing/drainer contract for the demo. Has two attack surfaces:
- `drain(address token)` — calls `transferFrom(victim, owner, balance)` on the token
- `drainFrom(address token, address victim)` — explicit victim drain

**Security features (intentionally weak for demo):** reentrancy lock (`bool _locked`) to prevent recursive exploits against the demo itself; CEI pattern; `receive()` forwards ETH to owner instead of locking.

#### InkSecPaymaster (`src/InkSecPaymaster.sol`)
Extends `BasePaymaster` from `eth-infinitism/account-abstraction` v0.7.

**Core logic in `_validatePaymasterUserOp`:**
```
callData[0:4]   → function selector (execute, executeBatch, etc.)
callData[4:36]  → target address (first 32-byte ABI word, trimmed to 20-byte address)

if callData.length >= 36 && blacklist[target] → revert BlacklistedTarget
else → return (context, validationData=0) → gas sponsorship approved
```

**Access control:** `onlyOwner` on `addToBlacklist` / `removeFromBlacklist`.

---

### 2. Backend API (`backend/src/`)

#### `services/decoder.ts`
Tries `decodeFunctionData` against ERC20_ABI first, then DRAINER_ABI. Returns a `DecodedCall` with function name and human-readable parameter strings. `isUnlimitedApproval()` checks if amount ≥ 10^30 (covers both MAX_UINT and near-max values).

#### `services/simulator.ts`
1. **Revert check:** `publicClient.call({ to, data, account: from })` — if throws, `success = false`.
2. **Approval simulation (approve calls):**
   - Read current `allowance(from, spender)` before.
   - After (inferred from decoded params): new allowance.
   - If new allowance is UNLIMITED → project balance drain: `after = "0 (if spender drains)"`.
3. **Transfer simulation:** read `balanceOf` before/after via state simulation.
4. **Drain simulation:** read current balance, project full drain.

The simulator does not use `trace_call` (not supported on Ink RPC) — it relies on ABI decoding + direct `readContract` calls for state, which is more portable.

#### `services/riskScorer.ts`

7 scoring rules (additive, capped at 100):

| Rule | Condition | Points |
|------|-----------|--------|
| 1 | Target in `maliciousAddresses.json` | +80 |
| 2 | Unlimited token approval (allowance > 10^30) | +40 |
| 3 | Token balance drain to zero | +50 |
| 4 | Contract deployed < 24h ago (binary search: bytecode at block N-43200) | +30 |
| 5 | Approval spender is an EOA (no bytecode) | +35 |
| 6 | Target contract not verified on Blockscout | +20 |
| 7 | Simulation reverts | +10 |

Rules 4, 5, 6 run concurrently (`Promise.all`). Score is capped at 100.

**Levels:** safe (0–20) → caution (21–50) → danger (51–79) → critical (80–100).

#### `routes/simulate.ts`
- Zod schema validates `{ from, to, data, value }` (all strings, `from`/`to` must match `0x[a-fA-F0-9]{40}`).
- Calls `simulateTransaction` → `scoreRisk` → builds `humanReadable` string.
- Returns `{ simulation, risk, humanReadable }`.

#### `utils/inkRpc.ts`
viem `publicClient` on Ink Sepolia (chain ID 763373, `https://rpc-gel-sepolia.inkonchain.com`). Re-exported `inkSepolia` chain definition used by Blockscout URL construction.

---

### 3. Frontend (`frontend/`)

#### `lib/aaWallet.ts`
Creates a ZeroDev Kernel v3.1 smart account backed by an ECDSA private key signer. In production this would use a passkey or social login; the demo uses a testnet private key directly.

The `createSmartAccount` function returns `{ address, client }` where `client` is a `KernelAccountClient` that can call `sendTransaction`.

#### `components/WalletConnect.tsx`
Reads `NEXT_PUBLIC_DEMO_PRIVATE_KEY` and `NEXT_PUBLIC_BUNDLER_URL` from env. Calls `createSmartAccount` on button click. Shows connected smart account address.

#### `components/TransactionPanel.tsx`
Three demo buttons, each encoding a different calldata:
1. `approve(safeAddr, 1000e6)` → low risk
2. `approve(drainerAddr, MAX_UINT)` → critical
3. `drain(tokenAddr)` called on drainerAddr → critical + blacklist hit

Flow: button click → `simulateUserOp()` → show `SimulationResult` + `RiskAlert` → user can Proceed or Cancel → if Proceed: `client.sendTransaction()`.

#### `components/RiskAlert.tsx`
Color-coded by risk level. Critical level shows skull icon, red border, reasons list, and "DO NOT SIGN" in bold. The Proceed button is enabled even at critical level to demonstrate that the user can override (showing the dual-protection value of the Paymaster).

---

### 4. SDK (`sdk/`)

`@inksec/guard-sdk` — a standalone npm package for wallet developers to integrate InkSec Guard with one function call:

```typescript
import { simulateAndWarn } from '@inksec/guard-sdk'

const result = await simulateAndWarn({
  from:  userAddress,
  to:    contractAddress,
  data:  encodedCalldata,
}, backendUrl)

if (result.shouldBlock) {
  showWarning(result.humanReadable)
  return // don't send
}

await sendUserOp(...)
```

`shouldBlock` is `true` when `risk.level` is `'danger'` or `'critical'`.

---

## Deployed Contracts (Ink Sepolia — chain 763373)

| Contract | Address | Blockscout |
|----------|---------|------------|
| MockERC20 (tUSDC) | `0x641822A13272b91af7D64245871523fD402156d6` | [view](https://explorer-sepolia.inkonchain.com/address/0x641822a13272b91af7d64245871523fd402156d6) |
| DrainerMock | `0x3Abb24f9016212f997767d8b85feCA98913a5933` | [view](https://explorer-sepolia.inkonchain.com/address/0x3abb24f9016212f997767d8b85feca98913a5933) |
| InkSecPaymaster | `0xA0c90BDd4578Bc4955Ff3350059837760af1fCEA` | [view](https://explorer-sepolia.inkonchain.com/address/0xa0c90bdd4578bc4955ff3350059837760af1fcea) |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | standard |

---

## Security Considerations

### What InkSec Guard catches
- Unlimited ERC-20 approvals to unverified/malicious contracts
- Direct calls to known drainer contracts
- Approvals to EOAs (wallets, not contracts) — unusual and suspicious
- Newly deployed contracts (< 24h) that haven't been vetted
- Transactions that revert on-chain (broken or obfuscated calls)

### What it does NOT catch (MVP scope)
- `permit()` signatures (EIP-2612) — no on-chain simulation needed, harder to detect
- Multi-hop attacks (approve safe contract → contract calls drainer)
- Flash loan attacks
- NFT approvals (`setApprovalForAll`)

### Dual protection rationale
The off-chain API can be bypassed (user ignores warning, builds own UserOp). The on-chain Paymaster provides a hard stop at the protocol level — the transaction cannot be gas-sponsored even if the user proceeds. This is the key differentiator from browser extension approaches.

---

## Data Flow Example — Malicious Approve

```
1. User clicks "Approve UNLIMITED to Drainer"

2. Frontend encodes calldata:
   approve(0x3Abb...5933, 0xffffffff...ffff)
   = 0x095ea7b3
     0000000000000000000000003abb24f9016212f997767d8b85feca98913a5933
     ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff

3. POST /api/v1/simulate {
     from:  "0xc002...175",
     to:    "0x6418...d6",    ← tUSDC contract
     data:  "0x095ea7b3...",
     value: "0"
   }

4. Backend:
   a. decoder: approve(0x3Abb...5933, UNLIMITED)
   b. simulator:
      - eth_call → success=true
      - allowance before: 0
      - allowance after: UNLIMITED
      - projected balance after drain: 0
   c. riskScorer:
      - Rule 1: 0x3Abb...5933 in maliciousAddresses.json → +80... wait
        Actually: targetAddress = 0x6418...d6 (the token), not drainer
        Rule 2: UNLIMITED approval → +40
        Rule 3: balance would drain to 0 → +50
        Rule 4: token deployed < 24h ago → +30
        Total: 120 → capped at 100

5. Response: { score: 100, level: "critical", recommendation: "DO NOT SIGN" }

6. Frontend renders red RiskAlert with skull icon
```

**Note:** Rule 1 (blacklist +80) fires when `to` is the drainer directly (3rd demo button — `drain()` call). For the approve scenario, the blacklist check fires against the token address (which is clean), but the combination of unlimited approval + drain projection already maxes the score at 100.
