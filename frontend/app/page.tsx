'use client'

import { useState } from 'react'
import WalletConnect from '../components/WalletConnect'
import TransactionPanel from '../components/TransactionPanel'
import type { SmartAccountInfo } from '../lib/aaWallet'

export default function Home() {
  const [account, setAccount] = useState<SmartAccountInfo | null>(null)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-indigo-400">InkSec</span> Guard
            </h1>
            <p className="text-gray-500 text-xs">
              Real-time transaction security for Ink Chain
            </p>
          </div>
          <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
            Ink Sepolia
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Wallet connection */}
        <section>
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
            1. Connect Smart Wallet
          </h2>
          <WalletConnect onConnected={setAccount} />
        </section>

        {/* Transaction demo */}
        {account && (
          <section>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
              2. Demo Transactions
            </h2>
            <TransactionPanel account={account} />
          </section>
        )}

        {/* How it works */}
        {!account && (
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3 text-sm text-gray-400">
            <h3 className="text-white font-semibold">How InkSec Guard works</h3>
            <ol className="space-y-2 list-decimal list-inside">
              <li>You initiate a transaction (approve, transfer, drain, etc.)</li>
              <li>InkSec intercepts and simulates it via <code className="text-indigo-300">eth_call</code></li>
              <li>The risk engine scores 7 threat patterns (blacklist, unlimited approval, drain, EOA target, etc.)</li>
              <li>You see a human-readable warning <strong className="text-white">before</strong> signing</li>
              <li>The ERC-4337 Paymaster also refuses gas sponsorship for blacklisted contracts</li>
            </ol>
          </section>
        )}
      </main>
    </div>
  )
}
