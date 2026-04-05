# InkSec Guard: Proactive Transaction Security for Ink Chain

## 🎯 Purpose of this Document
This document outlines the architecture, value proposition, and implementation strategy for **InkSec Guard**, a Web3 security infrastructure project. 
The primary goal is to apply for the **Ink Builder Program** (starting with the Spark track and scaling to the Forge track) to secure funding and official integration support within the Ink ecosystem.

---

## 🌐 Network Context: Ink Chain
**Ink** is a Layer 2 (L2) blockchain built by Kraken on the **Optimism (OP) Stack**, acting as a core component of the Optimism Superchain. Its primary mission is to bridge the gap between centralized exchange (CEX) users and the decentralized finance (DeFi) ecosystem ("DeFi unleashed").

* **Target Audience:** Millions of Kraken retail users onboarding to Web3.
* **Architecture:** OP Stack, EVM-compatible, native Account Abstraction (ERC-4337) support.
* **Focus:** Seamless UI/UX, low fees, and high security for consumer DeFi.

---

## 🚨 The Problem: Retail Vulnerability in DeFi
As Kraken seamlessly bridges Web2 retail users to Ink via Account Abstraction (e.g., Alchemy Account Kit, social logins, gasless transactions), these users face a steep learning curve. 
Retail users typically cannot read bytecode, do not understand the risks of infinite `ERC20 approvals`, and often fall victim to phishing links or malicious smart contracts (drainers). 
A single high-profile wallet drain exploit on Ink could severely damage Kraken's "legacy of security" and deter retail adoption.

---

## 💡 The Solution: InkSec Guard
**InkSec Guard** is a real-time transaction simulation and automated risk-scoring infrastructure designed specifically for Account Abstraction (AA) wallets on Ink. It acts as an invisible shield that prevents users from signing malicious transactions.

### Key Components

#### 1. Pre-Simulation & State Diff Engine (Backend API)
Before a `UserOperation` is sent to the mempool, it is routed through the InkSec API. The engine forks the current Ink state (via a local node or RPC), simulates the transaction, and analyzes the **State Diffs**:
* **Zero-Value Transfer Detection:** Flags transactions where the user's token balance decreases, but no equivalent value is returned.
* **Malicious Approval Guard:** Detects and flags `approve` or `permit` calls to unverified, recently deployed, or historically malicious contracts.

#### 2. Validating Paymaster (On-Chain)
A custom ERC-4337 `Paymaster` smart contract tailored for dApps and wallets on Ink. 
* When a sponsored transaction is initiated, the Paymaster queries the InkSec risk oracle or an on-chain registry of verified/malicious addresses.
* If the transaction risk score exceeds a safe threshold (e.g., a known drainer contract), the **Paymaster refuses to sponsor the gas**, effectively blocking the malicious transaction at the protocol level.

#### 3. Human-Readable SDK (Frontend / Wallet UI)
A lightweight npm package designed for Ink wallet developers. It translates complex hex data into plain English warnings:
> ⚠️ **Warning:** You are about to grant unlimited access to your USDC to an unverified contract. Risk Score: 98%.

---

## 📈 Why Ink Foundation Should Fund This (Grant Rationale)
1. **Direct Alignment with Kraken's Ethos:** Security and user protection are Kraken's core values. This tool protects their retail user base.
2. **Missing Infrastructure:** While developer tools like Tenderly exist on Ink, there is a lack of *user-facing* security plugins that natively integrate with ERC-4337 Paymasters.
3. **Ecosystem Growth:** Safe users are active users. By reducing the fear of getting scammed, overall Total Value Locked (TVL) and transaction volume on Ink will increase.

---

## 🚀 Go-to-Market & Grant Strategy

### Phase 1: Spark Program (Micro-grant: up to 5,000 USDC)
* **Goal:** "Just Ship" a working MVP on the Ink Testnet.
* **Deliverables:** 
  1. A basic API for simulating state diffs.
  2. A demo React frontend with an embedded AA wallet.
  3. A demo video showing a blocked transaction when interacting with a dummy "drainer" contract.
* **Timeline:** 2-4 weeks.

### Phase 2: Forge Program (Milestone-based grant: up to 200,000 USDC)
* **Goal:** Mainnet deployment, integration with major Ink wallets, and scaling across the Optimism Superchain.
* **Deliverables:** Production-ready Validating Paymaster, decentralized on-chain registry, and high-throughput API.

---

## 🔗 Official References & Documentation
Use these official links for your application and reference:
* **Ink Docs (Main):** [https://docs.inkonchain.com](https://docs.inkonchain.com)
* **Ink Builder Program Overview:** [https://docs.inkonchain.com/ink-builder-program/overview](https://docs.inkonchain.com/ink-builder-program/overview)
* **Spark Program (Track 1):** [https://docs.inkonchain.com/ink-builder-program/spark-program](https://docs.inkonchain.com/ink-builder-program/spark-program)
* **Forge Program (Track 2):** [https://docs.inkonchain.com/ink-builder-program/forge-program](https://docs.inkonchain.com/ink-builder-program/forge-program)
* **Echo Program (Track 3):** [https://docs.inkonchain.com/ink-builder-program/echo-program](https://docs.inkonchain.com/ink-builder-program/echo-program)
