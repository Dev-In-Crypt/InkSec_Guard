'use client'

import { useState } from 'react'
import { createSmartAccount, type SmartAccountInfo } from '../lib/aaWallet'

interface Props {
  onConnected: (info: SmartAccountInfo) => void
}

export default function WalletConnect({ onConnected }: Props) {
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)
  const [address, setAddress]   = useState<string | null>(null)

  async function connect() {
    setLoading(true)
    setError(null)

    const privateKey  = process.env.NEXT_PUBLIC_DEMO_PRIVATE_KEY as `0x${string}` | undefined
    const bundlerUrl  = process.env.NEXT_PUBLIC_BUNDLER_URL
    const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL

    if (!privateKey || !bundlerUrl) {
      setError('NEXT_PUBLIC_DEMO_PRIVATE_KEY and NEXT_PUBLIC_BUNDLER_URL must be set in .env.local')
      setLoading(false)
      return
    }

    try {
      const info = await createSmartAccount(privateKey, bundlerUrl, paymasterUrl)
      setAddress(info.address)
      onConnected(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  if (address) {
    return (
      <div className="rounded-lg border border-green-500 bg-green-950 p-4 text-sm">
        <p className="text-green-400 font-mono">
          <span className="text-green-300 font-semibold">Connected: </span>
          {address}
        </p>
        <p className="text-green-600 mt-1">Ink Sepolia · Smart Account (ZeroDev)</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={connect}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 font-semibold text-white transition-colors"
      >
        {loading ? 'Connecting…' : 'Connect Smart Wallet'}
      </button>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
