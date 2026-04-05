'use client'

import { useState } from 'react'
import { encodeFunctionData, maxUint256 } from 'viem'
import { simulateUserOp, type SimulateResponse } from '../lib/inkSecApi'
import type { SmartAccountInfo } from '../lib/aaWallet'
import RiskAlert from './RiskAlert'
import SimulationResultView from './SimulationResult'

// Addresses loaded from env — set in .env.local after Step 3 deploy
const TOKEN_ADDRESS   = (process.env.NEXT_PUBLIC_MOCK_ERC20    ?? '0x') as `0x${string}`
const DRAINER_ADDRESS = (process.env.NEXT_PUBLIC_DRAINER_MOCK  ?? '0x') as `0x${string}`
const SAFE_ADDRESS    = (process.env.NEXT_PUBLIC_SAFE_SPENDER  ?? '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') as `0x${string}`

const ERC20_ABI = [
  {
    name: 'approve', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const

interface Props { account: SmartAccountInfo }

type Stage = 'idle' | 'simulating' | 'awaiting-confirm' | 'sending' | 'done' | 'error'

interface PendingTx {
  calldata: `0x${string}`
  to:       `0x${string}`
  label:    string
  response: SimulateResponse
}

export default function TransactionPanel({ account }: Props) {
  const [stage,   setStage]   = useState<Stage>('idle')
  const [pending, setPending] = useState<PendingTx | null>(null)
  const [txHash,  setTxHash]  = useState<string | null>(null)
  const [err,     setErr]     = useState<string | null>(null)

  async function simulate(label: string, to: `0x${string}`, calldata: `0x${string}`) {
    setStage('simulating')
    setErr(null)
    setPending(null)
    setTxHash(null)
    try {
      const response = await simulateUserOp({
        from:  account.address,
        to,
        data:  calldata,
        value: '0',
      })
      setPending({ calldata, to, label, response })
      setStage('awaiting-confirm')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Simulation failed')
      setStage('error')
    }
  }

  async function sendTx() {
    if (!pending) return
    setStage('sending')
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = await (account.client as any).sendTransaction({
        to:   pending.to,
        data: pending.calldata,
      })
      setTxHash(hash as string)
      setStage('done')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Transaction failed')
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setPending(null)
    setErr(null)
    setTxHash(null)
  }

  // ── Demo buttons ────────────────────────────────────────────────────────────

  function approveToSafe() {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [SAFE_ADDRESS, 1000n * 10n ** 6n],
    })
    simulate('Approve 1000 tUSDC to Safe Contract', TOKEN_ADDRESS, calldata)
  }

  function approveToDrainer() {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [DRAINER_ADDRESS, maxUint256],
    })
    simulate('Approve UNLIMITED tUSDC to Drainer', TOKEN_ADDRESS, calldata)
  }

  function callDrainerDirectly() {
    const DRAINER_ABI = [
      {
        name: 'drain', type: 'function', stateMutability: 'nonpayable',
        inputs: [{ name: 'token', type: 'address' }], outputs: [],
      },
    ] as const
    const calldata = encodeFunctionData({
      abi: DRAINER_ABI, functionName: 'drain', args: [TOKEN_ADDRESS],
    })
    simulate('Call drain() directly on DrainerMock', DRAINER_ADDRESS, calldata)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Demo buttons */}
      {(stage === 'idle' || stage === 'error') && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DemoButton
            label="Approve to Safe Contract"
            description="approve(safeAddr, 1000 tUSDC)"
            color="green"
            onClick={approveToSafe}
          />
          <DemoButton
            label="Approve to Drainer"
            description="approve(drainer, MAX_UINT)"
            color="red"
            onClick={approveToDrainer}
          />
          <DemoButton
            label="Call Drainer Directly"
            description="drainer.drain(token)"
            color="red"
            onClick={callDrainerDirectly}
          />
        </div>
      )}

      {/* Simulating spinner */}
      {stage === 'simulating' && (
        <div className="text-center text-gray-400 py-8 animate-pulse">
          Simulating transaction…
        </div>
      )}

      {/* Results + confirm */}
      {stage === 'awaiting-confirm' && pending && (
        <div className="space-y-4">
          <h3 className="text-white font-semibold">{pending.label}</h3>
          <SimulationResultView simulation={pending.response.simulation} />
          <RiskAlert
            risk={pending.response.risk}
            humanReadable={pending.response.humanReadable}
            onProceed={sendTx}
            onCancel={reset}
            loading={false}
          />
        </div>
      )}

      {/* Sending */}
      {stage === 'sending' && (
        <div className="text-center text-indigo-400 py-8 animate-pulse">
          Sending UserOperation…
        </div>
      )}

      {/* Done */}
      {stage === 'done' && txHash && (
        <div className="rounded-xl border border-green-500 bg-green-950 p-5 space-y-2">
          <p className="text-green-300 font-semibold">Transaction sent!</p>
          <a
            href={`https://explorer-sepolia.inkonchain.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline text-sm font-mono break-all"
          >
            {txHash}
          </a>
          <button onClick={reset} className="block text-sm text-gray-400 hover:text-white mt-2">
            Run another demo
          </button>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && err && (
        <div className="rounded-xl border border-red-700 bg-red-950 p-4">
          <p className="text-red-300 text-sm">{err}</p>
          <button onClick={reset} className="text-sm text-gray-400 hover:text-white mt-2">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Small helper ──────────────────────────────────────────────────────────────

function DemoButton({
  label, description, color, onClick,
}: {
  label:       string
  description: string
  color:       'green' | 'red'
  onClick:     () => void
}) {
  const cls = color === 'green'
    ? 'border-green-700 hover:border-green-500 hover:bg-green-950'
    : 'border-red-700 hover:border-red-500 hover:bg-red-950'

  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 ${cls} bg-gray-900 p-4 text-left transition-colors space-y-1`}
    >
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-gray-500 text-xs font-mono">{description}</p>
    </button>
  )
}
