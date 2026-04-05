# InkSec Guard — Full Implementation Plan (Idea → Grant-Ready MVP)

> **Target:** Ink Builder Program — Spark Track (up to $5,000 USDC microgrant)
> **Apply here:** https://forms.inkonchain.com/spark-builder-program
> **Evaluation criteria:** Proof of Build, Ecosystem Usefulness, Feasibility, Builder Credibility, Creative Spark

---

## PROJECT OVERVIEW

**InkSec Guard** is a real-time transaction simulation and risk-scoring layer for ERC-4337 (Account Abstraction) wallets on Ink Chain. It intercepts `UserOperation` objects before they hit the mempool, simulates state diffs, scores risk, and presents human-readable warnings. For the Spark MVP the focus is: working API + demo frontend + demo video showing a blocked malicious transaction on Ink Sepolia testnet.

---

## INK CHAIN — REFERENCE DATA

| Parameter              | Mainnet                                | Testnet (Sepolia)                              |
|------------------------|----------------------------------------|------------------------------------------------|
| Chain ID               | 57073                                  | 763373                                         |
| RPC (HTTPS)            | `https://rpc-gel.inkonchain.com`       | `https://rpc-gel-sepolia.inkonchain.com`       |
| RPC (WSS)              | `wss://rpc-gel.inkonchain.com`         | `wss://rpc-gel-sepolia.inkonchain.com`         |
| Block Explorer         | `https://explorer.inkonchain.com`      | `https://explorer-sepolia.inkonchain.com`      |
| Currency               | ETH                                    | ETH                                            |
| Stack                  | OP Stack (Optimism Superchain), EVM    | Same                                           |
| AA Providers on Ink    | Alchemy Account Kit, Safe, ZeroDev    | Same                                           |
| Faucet                 | —                                      | https://docs.inkonchain.com/tools/faucets      |
| Deploy tutorials       | Foundry / Hardhat / Remix              | Same                                           |

---

## TECH STACK

| Layer      | Technology                                                    | Why                                                            |
|------------|---------------------------------------------------------------|----------------------------------------------------------------|
| Smart contracts | Solidity 0.8.x + Foundry                                | ERC-4337 Paymaster, dummy drainer, mock ERC-20. Foundry is Ink's recommended toolchain. |
| Backend API    | Node.js + TypeScript + Express (or Fastify)              | State diff simulation engine, risk scoring, REST endpoints.    |
| Frontend       | Next.js 14 (App Router) + Tailwind + wagmi + viem        | Demo wallet UI with embedded AA wallet via ZeroDev or Alchemy Account Kit. |
| AA SDK         | ZeroDev SDK (or Alchemy Account Kit)                     | Both natively support Ink Mainnet and Ink Sepolia.             |
| Testing        | Foundry tests (Solidity), Vitest (TS), Playwright (e2e)  | Full coverage for grant credibility.                           |
| Deployment     | Contracts → Ink Sepolia. Backend → Railway. Frontend → Vercel. | Free-tier friendly, fast CI/CD.                            |

---

## REPOSITORY STRUCTURE

```
inksec-guard/
├── contracts/                  # Foundry project
│   ├── src/
│   │   ├── InkSecPaymaster.sol         # Validating Paymaster (ERC-4337)
│   │   ├── DrainerMock.sol             # Dummy malicious contract for demo
│   │   └── MockERC20.sol               # Test token
│   ├── test/
│   │   └── InkSecPaymaster.t.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
├── backend/                    # Node.js API
│   ├── src/
│   │   ├── index.ts                    # Express server entrypoint
│   │   ├── routes/
│   │   │   └── simulate.ts             # POST /api/simulate
│   │   ├── services/
│   │   │   ├── simulator.ts            # State diff simulation logic
│   │   │   ├── riskScorer.ts           # Risk scoring engine
│   │   │   └── decoder.ts             # ABI decoder / human-readable output
│   │   ├── data/
│   │   │   └── maliciousAddresses.json # Known bad addresses registry
│   │   └── utils/
│   │       └── inkRpc.ts               # viem client configured for Ink Sepolia
│   └── tsconfig.json
├── frontend/                   # Next.js app
│   ├── app/
│   │   ├── page.tsx                    # Main demo page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── WalletConnect.tsx           # AA wallet connection (ZeroDev/Alchemy)
│   │   ├── TransactionPanel.tsx        # Send tx UI
│   │   ├── RiskAlert.tsx               # Human-readable warning modal
│   │   └── SimulationResult.tsx        # State diff visualization
│   ├── lib/
│   │   ├── inkSecApi.ts                # Backend API client
│   │   └── aaWallet.ts                 # AA wallet setup (ZeroDev SDK)
│   └── next.config.js
├── sdk/                        # (Optional) npm package skeleton
│   ├── src/
│   │   └── index.ts                    # simulateAndWarn(userOp) function
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEMO_SCRIPT.md                 # Step-by-step demo video script
├── .env.example
├── README.md
└── package.json
```

---

## IMPLEMENTATION PLAN — STEP BY STEP

Each step is a self-contained task for the AI coder. Steps are ordered by dependency — complete them sequentially.

---

### STEP 0: Project Scaffolding

**Goal:** Initialize the monorepo, install all dependencies, configure environment.

**Actions:**
1. Create root directory `inksec-guard/` with a root `package.json` (workspaces: `contracts`, `backend`, `frontend`, `sdk`).
2. Run `forge init contracts` inside the root. Set `foundry.toml`:
   ```toml
   [profile.default]
   src = "src"
   out = "out"
   libs = ["lib"]
   evm_version = "paris"
   optimizer = true
   optimizer_runs = 200

   [rpc_endpoints]
   ink_sepolia = "${INK_SEPOLIA_RPC}"
   ```
3. Initialize `backend/` as a TypeScript Node.js project: `npm init`, install `express`, `viem`, `typescript`, `tsx`, `dotenv`, `zod`.
4. Initialize `frontend/` with `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir=no`.
5. Install wagmi, viem, @zerodev/sdk (or @alchemy/aa-core) in frontend.
6. Create `.env.example` with:
   ```
   INK_SEPOLIA_RPC=https://rpc-gel-sepolia.inkonchain.com
   INK_SEPOLIA_CHAIN_ID=763373
   DEPLOYER_PRIVATE_KEY=
   BUNDLER_URL=
   ZERODEV_PROJECT_ID=
   BACKEND_URL=http://localhost:3001
   ```

**Done when:** `forge build` compiles, `npx tsx backend/src/index.ts` starts, `npm run dev` in frontend loads a blank Next.js page.

---

### STEP 1: Smart Contracts — MockERC20 + DrainerMock

**Goal:** Create the test tokens and a dummy malicious contract that the demo will use.

**File: `contracts/src/MockERC20.sol`**
- Standard ERC-20 with public `mint(address to, uint256 amount)` function.
- No access control needed (testnet only).
- Name: "InkSec Test USDC", symbol: "tUSDC", decimals: 6.

**File: `contracts/src/DrainerMock.sol`**
- A contract that, when called via `approve()` or a custom `drain()` function, attempts to `transferFrom` the caller's full tUSDC balance to the contract owner.
- Must include a `receive()` fallback.
- Purpose: simulate a real-world drainer/phishing contract for the demo.

**File: `contracts/test/Mocks.t.sol`**
- Test: mint tokens → approve DrainerMock → call drain → verify balance moved.
- Test: mint tokens → direct transfer → verify balances.

**Done when:** `forge test` passes all mock tests.

---

### STEP 2: Smart Contract — InkSecPaymaster (ERC-4337 Validating Paymaster)

**Goal:** Build a Paymaster that refuses to sponsor gas for UserOperations targeting blacklisted addresses.

**File: `contracts/src/InkSecPaymaster.sol`**
- Inherit from the ERC-4337 `BasePaymaster` (use `eth-infinitism/account-abstraction` v0.7 or compatible version).
- Storage: `mapping(address => bool) public blacklist` — owner can add/remove addresses.
- Override `_validatePaymasterUserOp`:
  1. Decode the `UserOperation.callData` to extract the target address (`to` field).
  2. If `to` is in `blacklist`, revert with `InkSecPaymaster__BlacklistedTarget(address target)`.
  3. Otherwise, return valid validation data (accept sponsorship).
- Owner functions: `addToBlacklist(address)`, `removeFromBlacklist(address)`, `isBlacklisted(address) view`.
- Fund the Paymaster via `deposit()` on the EntryPoint.

**File: `contracts/test/InkSecPaymaster.t.sol`**
- Test: Paymaster accepts UserOp to a clean address → validation passes.
- Test: Paymaster rejects UserOp to a blacklisted address → revert.
- Test: Owner can add/remove from blacklist.
- Test: Non-owner cannot modify blacklist.

**Key dependency:** Install `eth-infinitism/account-abstraction`:
```bash
forge install eth-infinitism/account-abstraction --no-commit
```

**Done when:** `forge test` passes all Paymaster tests. At least 6 tests total across all contracts.

---

### STEP 3: Contract Deployment Script

**Goal:** Deploy all three contracts to Ink Sepolia and save addresses.

**File: `contracts/script/Deploy.s.sol`**
- Deploy MockERC20 → log address.
- Deploy DrainerMock(owner) → log address.
- Deploy InkSecPaymaster(entryPoint, owner) → log address.
- Add DrainerMock address to Paymaster blacklist.
- Mint 10,000 tUSDC to a test wallet.

**Execution:**
```bash
forge script script/Deploy.s.sol --rpc-url $INK_SEPOLIA_RPC --broadcast --verify --verifier blockscout --verifier-url https://explorer-sepolia.inkonchain.com/api/
```

**File: `contracts/deployments/ink-sepolia.json`**
- Save deployed addresses in JSON for backend/frontend to consume.

**Done when:** All three contracts are deployed and verified on Ink Sepolia explorer.

---

### STEP 4: Backend — State Diff Simulation Engine

**Goal:** Build the core API endpoint that simulates a transaction and returns a risk score.

**File: `backend/src/utils/inkRpc.ts`**
- Create a viem `publicClient` configured for Ink Sepolia (chain ID 763373, RPC URL from env).
- Create a viem `walletClient` if needed for test operations.

**File: `backend/src/services/simulator.ts`**
- Function: `simulateTransaction(params: { from, to, data, value }): Promise<SimulationResult>`
- Use `publicClient.call()` with state overrides OR `eth_call` with `trace_call` (if supported by Ink RPC) to simulate the transaction.
- Alternative approach (more reliable): use viem's `simulateContract()` to dry-run the call and catch reverts.
- Parse the result to extract:
  - Token balance changes (before/after for ERC-20 `balanceOf`).
  - Approval changes (before/after for ERC-20 `allowance`).
  - ETH balance changes.
- Return a `SimulationResult` object:
  ```typescript
  interface SimulationResult {
    success: boolean;
    balanceChanges: { token: string; symbol: string; before: string; after: string; delta: string }[];
    approvalChanges: { token: string; spender: string; oldAllowance: string; newAllowance: string }[];
    ethDelta: string;
    decodedFunction: string; // e.g. "approve(address,uint256)"
    warnings: string[];
  }
  ```

**File: `backend/src/services/decoder.ts`**
- Function: `decodeCalldata(data: string, knownAbis: ABI[]): DecodedCall`
- Use viem's `decodeFunctionData` with known ABIs (ERC-20, DrainerMock).
- Return function name, parameters in human-readable format.

**Done when:** Unit test — calling `simulateTransaction` with a mock `approve(drainerAddress, MAX_UINT)` calldata returns a `SimulationResult` with the approval change and a warning.

---

### STEP 5: Backend — Risk Scoring Engine

**Goal:** Score every simulated transaction from 0 (safe) to 100 (critical risk).

**File: `backend/src/services/riskScorer.ts`**
- Function: `scoreRisk(simulation: SimulationResult, targetAddress: string): RiskScore`
- Scoring rules (additive, cap at 100):
  | Condition | Points |
  |---|---|
  | Target is in `maliciousAddresses.json` | +80 |
  | `approve` call with unlimited allowance (> 10^18) | +40 |
  | `approve` to a contract deployed < 24h ago | +30 |
  | User's token balance decreases with no incoming value | +50 |
  | Target contract is not verified on explorer | +20 |
  | Target is an EOA receiving an approval | +35 |
  | Transaction reverts in simulation | +10 (suspicious) |
- Return:
  ```typescript
  interface RiskScore {
    score: number;          // 0-100
    level: "safe" | "caution" | "danger" | "critical";
    reasons: string[];      // human-readable reasons
    recommendation: string; // "Proceed" | "Review carefully" | "DO NOT SIGN"
  }
  ```
- Thresholds: safe (0-20), caution (21-50), danger (51-79), critical (80-100).

**File: `backend/src/data/maliciousAddresses.json`**
- Seed with the DrainerMock deployed address.
- Structure: `[{ "address": "0x...", "label": "DrainerMock", "reportedAt": "2026-..." }]`

**Done when:** Unit test — scoring a simulated `approve(drainer, MAX_UINT)` returns score ≥ 80, level "critical".

---

### STEP 6: Backend — REST API

**Goal:** Expose the simulation + scoring as a single API endpoint.

**File: `backend/src/routes/simulate.ts`**
- `POST /api/v1/simulate`
- Request body (validated with Zod):
  ```json
  {
    "from": "0x...",
    "to": "0x...",
    "data": "0x...",
    "value": "0"
  }
  ```
- Response:
  ```json
  {
    "simulation": { ... },
    "risk": { "score": 92, "level": "critical", "reasons": [...], "recommendation": "DO NOT SIGN" },
    "humanReadable": "You are about to grant unlimited access to your tUSDC to an unverified contract (0x...abc). Risk Score: 92%."
  }
  ```

**File: `backend/src/routes/health.ts`**
- `GET /api/v1/health` — returns `{ status: "ok", chain: "ink-sepolia", blockNumber: N }`.

**File: `backend/src/index.ts`**
- Express app with CORS enabled (for frontend dev), JSON body parser.
- Mount `/api/v1/simulate` and `/api/v1/health`.
- Listen on port from env (default 3001).

**Done when:** `curl -X POST localhost:3001/api/v1/simulate -d '{"from":"0x...","to":"<drainer>","data":"0x095ea7b3...","value":"0"}'` returns a valid risk assessment.

---

### STEP 7: Frontend — AA Wallet Setup

**Goal:** Connect an ERC-4337 smart wallet to Ink Sepolia in the Next.js app.

**File: `frontend/lib/aaWallet.ts`**
- Configure ZeroDev (or Alchemy Account Kit) for Ink Sepolia:
  - Chain ID: 763373
  - RPC: from env
  - Bundler URL: from ZeroDev dashboard (free tier available)
  - Paymaster: InkSecPaymaster address from deployment
- Export a hook or function: `useSmartAccount()` that returns the smart account client.

**File: `frontend/components/WalletConnect.tsx`**
- "Connect Wallet" button.
- On click: create a smart account via ZeroDev (passkey or social login for demo simplicity).
- Show connected address and tUSDC balance.

**File: `frontend/lib/inkSecApi.ts`**
- Wrapper around `fetch` to call backend:
  ```typescript
  export async function simulateUserOp(params: { from, to, data, value }): Promise<ApiResponse> { ... }
  ```

**Done when:** Frontend connects a smart wallet on Ink Sepolia and displays the address + ETH balance.

---

### STEP 8: Frontend — Transaction Panel + InkSec Guard Integration

**Goal:** Build the UI that lets users send transactions, intercepts them through InkSec API, and shows warnings.

**File: `frontend/components/TransactionPanel.tsx`**
- Two demo buttons:
  1. **"Approve tUSDC to Safe Contract"** — constructs an `approve(safeAddress, 1000)` call → sends to InkSec API → gets low risk → shows green "Safe" badge → user can proceed.
  2. **"Approve tUSDC to Drainer"** — constructs an `approve(drainerAddress, MAX_UINT)` call → sends to InkSec API → gets critical risk → shows red warning modal → blocks by default.
- Flow:
  1. User clicks a button.
  2. Frontend calls `POST /api/v1/simulate` with the constructed calldata.
  3. Frontend renders `SimulationResult` component (balance changes, decoded function).
  4. Frontend renders `RiskAlert` component based on risk level.
  5. If safe: user can click "Confirm & Send" → sends UserOp via the AA wallet.
  6. If critical: modal shows warning, "Proceed Anyway" button is red and requires double confirmation.

**File: `frontend/components/RiskAlert.tsx`**
- Props: `{ score, level, reasons, recommendation, humanReadable }`
- Visual:
  - `safe`: green border, checkmark icon, "Transaction looks safe."
  - `caution`: yellow border, warning icon, reasons listed.
  - `danger`: orange border, exclamation icon, bold warning text.
  - `critical`: red border, skull/shield icon, `humanReadable` message in large text, "DO NOT SIGN" recommendation.

**File: `frontend/components/SimulationResult.tsx`**
- Shows a table of balance changes (token, before, after, delta with color coding).
- Shows decoded function name and parameters.
- Shows approval changes with spender address.

**Done when:** Full demo flow works — clicking "Approve to Drainer" shows a red critical warning with human-readable explanation. Clicking "Approve to Safe Contract" shows green safe result.

---

### STEP 9: End-to-End Testing

**Goal:** Verify the full pipeline on Ink Sepolia.

**Tests to write and pass:**

1. **Contract tests** (`forge test`): All Paymaster and mock tests pass.
2. **Backend unit tests** (Vitest):
   - `simulator.test.ts`: Simulates approve/transfer calls, returns correct diffs.
   - `riskScorer.test.ts`: Scores known patterns correctly.
   - `decoder.test.ts`: Decodes ERC-20 approve/transfer calldata.
   - `api.test.ts`: Integration test — POST to `/api/v1/simulate` returns valid response.
3. **Frontend e2e** (optional but good for demo credibility):
   - Playwright test: connect wallet → click "Approve to Drainer" → verify red warning appears.

**Done when:** All tests pass. `npm test` in root runs all test suites.

---

### STEP 10: Deployment

**Goal:** Ship everything live with public URLs.

1. **Contracts:** Already deployed to Ink Sepolia in Step 3.
2. **Backend → Railway:**
   - Create a Railway project, connect GitHub repo.
   - Set environment variables (RPC URL, deployed contract addresses).
   - Deploy the `backend/` directory.
   - Note the public URL: `https://inksec-api.up.railway.app`.
3. **Frontend → Vercel:**
   - Connect GitHub repo to Vercel.
   - Set environment: `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_ZERODEV_PROJECT_ID`, etc.
   - Deploy.
   - Note the public URL: `https://inksec-guard.vercel.app`.
4. **Verify everything works end-to-end on the live URLs.**

**Done when:** A user can visit the Vercel URL, connect a wallet, and see InkSec Guard warnings live.

---

### STEP 11: Documentation & README

**Goal:** Write clear documentation that demonstrates builder credibility for the grant.

**File: `README.md`**
Structure:
1. **Project title + one-line description + badges** (Ink Sepolia, ERC-4337, MIT License).
2. **Problem** — 2-3 sentences on retail user vulnerability in DeFi.
3. **Solution** — what InkSec Guard does (simulation, risk scoring, human-readable warnings).
4. **Architecture diagram** — mermaid diagram showing: User → Frontend → InkSec API → Ink RPC → Risk Score → UI Warning.
5. **Live Demo** — link to Vercel deployment.
6. **Quick Start** — clone, install, `.env`, run locally.
7. **API Reference** — `POST /api/v1/simulate` request/response docs.
8. **Smart Contracts** — deployed addresses on Ink Sepolia with explorer links.
9. **Testing** — how to run tests, current coverage.
10. **Roadmap** — Spark → Forge progression plan.
11. **Grant alignment** — why this matters for Ink ecosystem.

**File: `docs/ARCHITECTURE.md`**
- Detailed technical architecture: components, data flow, security considerations.

**Done when:** README is complete and renders well on GitHub.

---

### STEP 12: Demo Video

**Goal:** Record a 2-3 minute Loom/video showing the product in action. This is a required deliverable for the Spark application.

**File: `docs/DEMO_SCRIPT.md`**
Script:
1. **(0:00–0:15) Intro:** "InkSec Guard — proactive transaction security for Ink Chain. Built for retail users onboarding via Kraken."
2. **(0:15–0:45) The Problem:** Show a screen of a phishing site / explain unlimited approvals risk for new users. Show Ink's AA onboarding flow (social login → smart wallet).
3. **(0:45–1:30) Safe Transaction Demo:** Open the app → connect AA wallet → click "Approve to Safe Contract" → show green simulation result → state diffs → "Safe" badge → transaction goes through.
4. **(1:30–2:15) Malicious Transaction Demo:** Click "Approve to Drainer" → show red critical warning → human-readable message → risk score 92% → "DO NOT SIGN" → transaction blocked. Show the decoded function and balance impact.
5. **(2:15–2:30) Paymaster Demo (bonus):** Show that the Paymaster also refuses to sponsor gas for the drainer address — double protection layer.
6. **(2:30–2:50) Tech Stack + Architecture:** Quick flash of the architecture diagram, mention: Foundry contracts, Node.js simulation API, Next.js frontend, ZeroDev AA wallet, all on Ink Sepolia.
7. **(2:50–3:00) Outro:** "InkSec Guard. Protecting Ink's next million users. Spark grant application for the Ink Builder Program."

**Done when:** Video is recorded, uploaded to Loom/YouTube (unlisted), link ready for grant application.

---

### STEP 13: Grant Application Submission

**Goal:** Submit to the Spark program with all deliverables.

**Application form:** https://forms.inkonchain.com/spark-builder-program

**Required fields (mapped to what you've built):**

| Field | Content |
|---|---|
| What you're building | InkSec Guard — real-time tx simulation & risk scoring for AA wallets on Ink. |
| Why it matters for Ink | Protects Kraken's retail users from drainer contracts, phishing approvals. Missing infra for consumer security on Ink. Safe users = more TVL. |
| Proof of build | GitHub repo link, live demo URL (Vercel), demo video (Loom) |
| Grant amount requested | $3,000–$5,000 USDC |
| What the grant enables | Cover ZeroDev/Alchemy AA infra costs, mainnet deployment gas, domain/hosting for production, expand malicious address registry. |
| Traction signals | Working testnet deployment, X tests passing, live demo URL, open-source repo. |
| Distribution plan | Integrate as an npm package (`@inksec/guard-sdk`) for any Ink wallet dev. Approach Ink ecosystem wallets for integration. |

---

## SPARK → FORGE UPGRADE PATH

Once Spark is approved and MVP is live, the path to Forge ($50K–$200K) requires:

1. **Mainnet deployment** — all contracts on Ink Mainnet (chain ID 57073).
2. **Decentralized malicious address registry** — on-chain, community-curated, with staking for reporters.
3. **High-throughput API** — WebSocket support, sub-200ms simulation latency, caching layer.
4. **SDK npm package** — `@inksec/guard-sdk` with `simulateAndWarn(userOp)` one-liner for wallet devs.
5. **Integration partnerships** — at least 1-2 Ink ecosystem wallets using InkSec Guard.
6. **Metrics dashboard** — transactions scanned, threats blocked, users protected.
7. **Superchain expansion** — extend to other OP Stack chains (Base, Optimism, Zora).

---

## KEY REFERENCES

- Ink Docs: https://docs.inkonchain.com
- Ink Builder Program Overview: https://docs.inkonchain.com/ink-builder-program/overview
- Spark Program: https://docs.inkonchain.com/ink-builder-program/spark-program
- Forge Program: https://docs.inkonchain.com/ink-builder-program/forge-program
- Ink Network Info: https://docs.inkonchain.com/general/network-information
- Ink AA Tools: https://docs.inkonchain.com/tools/account-abstraction
- Ink Block Explorer (Sepolia): https://explorer-sepolia.inkonchain.com
- Spark Application Form: https://forms.inkonchain.com/spark-builder-program
- ERC-4337 Reference: https://eips.ethereum.org/EIPS/eip-4337
- eth-infinitism/account-abstraction: https://github.com/eth-infinitism/account-abstraction
- ZeroDev Docs: https://docs.zerodev.app
- Alchemy Account Kit: https://www.alchemy.com/account-kit
