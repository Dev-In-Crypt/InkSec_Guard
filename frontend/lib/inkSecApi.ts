const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'https://backend-production-916d.up.railway.app').replace(/\/$/, '')

// ── Types mirroring backend SimulationResult / RiskScore ─────────────────────

export interface BalanceChange {
  token:  string
  symbol: string
  before: string
  after:  string
  delta:  string
}

export interface ApprovalChange {
  token:        string
  spender:      string
  oldAllowance: string
  newAllowance: string
}

export interface SimulationResult {
  success:         boolean
  balanceChanges:  BalanceChange[]
  approvalChanges: ApprovalChange[]
  ethDelta:        string
  decodedFunction: string
  warnings:        string[]
}

export interface RiskScore {
  score:          number
  level:          'safe' | 'caution' | 'danger' | 'critical'
  reasons:        string[]
  recommendation: string
}

export interface SimulateResponse {
  simulation:    SimulationResult
  risk:          RiskScore
  humanReadable: string
}

// ── API client ────────────────────────────────────────────────────────────────

export async function simulateUserOp(params: {
  from:  string
  to:    string
  data:  string
  value: string
}): Promise<SimulateResponse> {
  const res = await fetch(`${BACKEND_URL}/api/v1/simulate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<SimulateResponse>
}
