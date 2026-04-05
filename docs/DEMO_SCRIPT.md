# InkSec Guard — Demo Video Script

Target length: **2:30–3:00 min** | Format: Loom screen recording + voiceover

---

## Setup before recording

- [ ] Backend running: `npm run dev:backend`
- [ ] Frontend running: `npm run dev:frontend` (localhost:3000)
- [ ] Contracts deployed on Ink Sepolia, addresses in `.env.local`
- [ ] Smart wallet funded with testnet ETH and 10,000 tUSDC (from deploy script)
- [ ] Browser: dark mode, 1280x800, DevTools closed
- [ ] Loom recording: full screen + microphone

---

## Script

### 0:00–0:15 — Hook

> "Every day, thousands of retail users get their tokens drained because
> they blindly signed a transaction.
> InkSec Guard stops that — in real time, before you sign.
> Built for Ink Chain. Built for the next million users."

_Show: InkSec Guard homepage_

---

### 0:15–0:40 — The Problem

> "When you connect to a DeFi app, it often asks you to 'approve' a
> token allowance. One wrong click — unlimited approval to a drainer —
> and your entire balance is gone.
> Ink Chain's Account Abstraction makes onboarding easy, but wallets
> have no built-in protection against this."

_Show: A simple sketch of approve → drain flow_

---

### 0:40–1:10 — Safe Transaction Demo

> "Let me show you InkSec Guard in action.
> I click 'Approve 1000 tUSDC to Safe Contract'.
> Before anything is signed, InkSec simulates the call…"

_Click: 'Approve to Safe Contract' button_

> "Green. Risk score 0%. The simulation shows exactly what will change:
> a 1000 tUSDC allowance to a known safe address.
> I can confidently confirm."

_Show: green RiskAlert, SimulationResult table, click Confirm_

---

### 1:10–1:50 — Malicious Approve Demo

> "Now watch what happens with a phishing transaction.
> I click 'Approve UNLIMITED tUSDC to Drainer'."

_Click: 'Approve to Drainer' button_

> "Red. Critical. Risk score 92%.
> InkSec decoded the calldata — this is an unlimited approval
> to a contract in our malicious registry.
> If signed, your entire balance could be drained at any time.
> The recommendation: DO NOT SIGN."

_Show: red RiskAlert with skull icon, reasons list, humanReadable message_

---

### 1:50–2:20 — Paymaster Demo (Double Protection)

> "The third button calls the DrainerMock directly.
> This triggers a second layer of protection — the ERC-4337 Paymaster."

_Click: 'Call Drainer Directly' button_

> "The simulation warns us again. But even if a user ignored the warning
> and tried to send — our Validating Paymaster on Ink Sepolia would
> refuse to sponsor gas for this transaction.
> The UserOperation is blocked at the protocol level."

_Show: critical risk alert, note about Paymaster_

---

### 2:20–2:45 — Tech Stack

> "Under the hood:
> Foundry smart contracts on Ink Sepolia.
> A Node.js simulation API — eth_call, state diffs, 7 risk rules.
> Next.js frontend with ZeroDev Account Abstraction.
> 65 automated tests across Solidity and TypeScript.
> Fully open source."

_Show: quick flash of code / test output / architecture diagram_

---

### 2:45–3:00 — Outro

> "InkSec Guard. Protecting Ink's next million users.
> Applying to the Ink Builder Program — Spark Track.
> Links in the description."

_Show: homepage with InkSec Guard logo_

---

## Key talking points (if questions come up)

- **Why Ink?** OP Stack L2 backed by Kraken — massive retail user pipeline
  needs security infrastructure.
- **Why ERC-4337?** AA wallets are the future of onboarding; simulation
  must happen at the UserOp layer.
- **What makes it different?** Human-readable output + dual protection
  (API + Paymaster) + open registry.
- **Grant use of funds:** ZeroDev bundler costs, mainnet deploy gas,
  domain + hosting, registry expansion.
