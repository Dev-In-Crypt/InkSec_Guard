'use client'

import { useState, useEffect } from 'react'
import { createPasskeyAccount, type SmartAccountInfo } from '../lib/aaWallet'

interface Props {
  onConnected: (info: SmartAccountInfo) => void
}

const STORAGE_KEY = 'inksec_passkey_registered'

export default function WalletConnect({ onConnected }: Props) {
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [address,       setAddress]       = useState<string | null>(null)
  const [hasRegistered, setHasRegistered] = useState(false)

  // Check localStorage on mount (client-side only — no window on server)
  useEffect(() => {
    setHasRegistered(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  async function connect(mode: 'register' | 'login') {
    const bundlerUrl   = process.env.NEXT_PUBLIC_BUNDLER_URL
    // Paymaster disabled: ZeroDev rejects passkey validators with pm_getPaymasterStubData
    const paymasterUrl = undefined

    if (!bundlerUrl) {
      setError('NEXT_PUBLIC_BUNDLER_URL must be set in .env.local')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const info = await createPasskeyAccount(mode, bundlerUrl, paymasterUrl)
      if (mode === 'register') {
        localStorage.setItem(STORAGE_KEY, 'true')
        setHasRegistered(true)
      }
      setAddress(info.address)
      onConnected(info)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect wallet')
    } finally {
      setLoading(false)
    }
  }

  function resetRegistration() {
    localStorage.removeItem(STORAGE_KEY)
    setHasRegistered(false)
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
        onClick={() => connect('register')}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 font-semibold text-white transition-colors"
      >
        {loading && !hasRegistered ? 'Creating…' : 'Create Wallet'}
      </button>

      {hasRegistered && (
        <button
          onClick={() => connect('login')}
          disabled={loading}
          className="w-full rounded-lg border border-gray-600 hover:border-gray-400 disabled:opacity-50 px-6 py-3 font-semibold text-gray-300 transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      )}

      {hasRegistered && (
        <p className="text-center text-xs text-gray-600">
          Different device?{' '}
          <button
            onClick={resetRegistration}
            className="text-gray-500 underline hover:text-gray-400"
          >
            Reset
          </button>
        </p>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
