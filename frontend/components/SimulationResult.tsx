'use client'

import type { SimulationResult as SimResult } from '../lib/inkSecApi'

interface Props { simulation: SimResult }

function deltaColor(delta: string) {
  if (delta.startsWith('+')) return 'text-green-400'
  if (delta.startsWith('-')) return 'text-red-400'
  return 'text-gray-400'
}

export default function SimulationResult({ simulation }: Props) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-5 text-sm">
      {/* Decoded function */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Decoded Call</p>
        <code className="text-indigo-300 break-all">{simulation.decodedFunction}</code>
      </div>

      {/* Balance changes */}
      {simulation.balanceChanges.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Balance Changes</p>
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="pb-1 pr-4">Token</th>
                <th className="pb-1 pr-4">Before</th>
                <th className="pb-1 pr-4">After</th>
                <th className="pb-1">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {simulation.balanceChanges.map((b, i) => (
                <tr key={i} className="text-gray-200">
                  <td className="py-1 pr-4 font-mono text-xs truncate max-w-[120px]">{b.symbol}</td>
                  <td className="py-1 pr-4">{b.before}</td>
                  <td className="py-1 pr-4">{b.after}</td>
                  <td className={`py-1 font-semibold ${deltaColor(b.delta)}`}>{b.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval changes */}
      {simulation.approvalChanges.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Approval Changes</p>
          {simulation.approvalChanges.map((a, i) => (
            <div key={i} className="text-gray-200 space-y-0.5">
              <p>
                <span className="text-gray-500">Spender: </span>
                <span className="font-mono text-xs">{a.spender}</span>
              </p>
              <p>
                <span className="text-gray-500">Allowance: </span>
                <span className="text-yellow-300 line-through mr-2">{a.oldAllowance}</span>
                <span className={a.newAllowance === 'UNLIMITED' ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {a.newAllowance}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Simulator warnings */}
      {simulation.warnings.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Simulator Warnings</p>
          <ul className="space-y-1 text-yellow-300 text-xs">
            {simulation.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
          </ul>
        </div>
      )}

      {/* Success badge */}
      <div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          simulation.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          eth_call: {simulation.success ? 'would succeed' : 'would revert'}
        </span>
      </div>
    </div>
  )
}
