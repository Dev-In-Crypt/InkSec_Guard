'use client'

import type { RiskScore } from '../lib/inkSecApi'

interface Props {
  risk:          RiskScore
  humanReadable: string
  onProceed:     () => void
  onCancel:      () => void
  loading:       boolean
}

const CONFIG = {
  safe: {
    border: 'border-green-500',
    bg:     'bg-green-950',
    badge:  'bg-green-700 text-green-100',
    icon:   '✓',
    title:  'Transaction looks safe',
    proceedClass: 'bg-green-600 hover:bg-green-500',
  },
  caution: {
    border: 'border-yellow-500',
    bg:     'bg-yellow-950',
    badge:  'bg-yellow-700 text-yellow-100',
    icon:   '⚠',
    title:  'Proceed with caution',
    proceedClass: 'bg-yellow-600 hover:bg-yellow-500',
  },
  danger: {
    border: 'border-orange-500',
    bg:     'bg-orange-950',
    badge:  'bg-orange-700 text-orange-100',
    icon:   '!',
    title:  'High risk detected',
    proceedClass: 'bg-orange-600 hover:bg-orange-500',
  },
  critical: {
    border: 'border-red-500',
    bg:     'bg-red-950',
    badge:  'bg-red-700 text-red-100',
    icon:   '☠',
    title:  'DO NOT SIGN',
    proceedClass: 'bg-red-700 hover:bg-red-600',
  },
}

export default function RiskAlert({ risk, humanReadable, onProceed, onCancel, loading }: Props) {
  const cfg = CONFIG[risk.level]

  return (
    <div className={`rounded-xl border-2 ${cfg.border} ${cfg.bg} p-6 space-y-4`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full ${cfg.badge}`}>
          {cfg.icon}
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">{cfg.title}</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}>
            Risk Score: {risk.score}%
          </span>
        </div>
      </div>

      {/* Human-readable summary */}
      {risk.level === 'critical' && (
        <p className="text-red-200 font-semibold text-base leading-snug">{humanReadable}</p>
      )}

      {/* Reasons list */}
      {risk.reasons.length > 0 && (
        <ul className="space-y-1 text-sm text-gray-300">
          {risk.reasons.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="shrink-0 mt-0.5">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onProceed}
          disabled={loading}
          className={`flex-1 rounded-lg px-4 py-2 font-semibold text-white disabled:opacity-50 transition-colors ${cfg.proceedClass}`}
        >
          {loading
            ? 'Sending…'
            : risk.level === 'critical'
              ? 'Proceed Anyway (Risky!)'
              : `Confirm & Send`}
        </button>
      </div>
    </div>
  )
}
