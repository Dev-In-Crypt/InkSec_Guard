// @inksec/guard-sdk
// One-liner security check for ERC-4337 wallet developers on Ink Chain.
//
// Usage:
//   import { simulateAndWarn } from '@inksec/guard-sdk'
//   const result = await simulateAndWarn({ from, to, data }, backendUrl)
//   if (result.shouldBlock) { showWarning(result.humanReadable); return }
//   await sendUserOp(...)

export interface SimulateParams {
  /** Address sending the transaction (smart account address) */
  from:   string
  /** Contract or EOA being called */
  to:     string
  /** ABI-encoded calldata (hex string, 0x-prefixed) */
  data:   string
  /** ETH value in wei as a string (default "0") */
  value?: string
}

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

export interface SimulateAndWarnResult {
  simulation:    SimulationResult
  risk:          RiskScore
  humanReadable: string
  /** true when level is 'danger' or 'critical' — wallet should block or warn prominently */
  shouldBlock:   boolean
}

/**
 * Simulate a transaction through the InkSec Guard API and return a risk assessment.
 *
 * @param params   - { from, to, data, value }
 * @param apiUrl   - InkSec Guard backend URL (default: production Railway URL)
 * @returns        SimulateAndWarnResult with risk score, reasons, and shouldBlock flag
 *
 * @example
 * const result = await simulateAndWarn({
 *   from: account.address,
 *   to:   tokenContract,
 *   data: encodedApproveCalldata,
 * })
 * if (result.shouldBlock) {
 *   alert(result.humanReadable)
 *   return
 * }
 * await sendUserOperation(...)
 */
export async function simulateAndWarn(
  params:  SimulateParams,
  apiUrl = 'https://inksec-api.up.railway.app',
): Promise<SimulateAndWarnResult> {
  const body = {
    from:  params.from,
    to:    params.to,
    data:  params.data,
    value: params.value ?? '0',
  }

  const res = await fetch(`${apiUrl}/api/v1/simulate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  const data = (await res.json()) as {
    simulation:    SimulationResult
    risk:          RiskScore
    humanReadable: string
  }

  return {
    simulation:    data.simulation,
    risk:          data.risk,
    humanReadable: data.humanReadable,
    shouldBlock:   data.risk.level === 'danger' || data.risk.level === 'critical',
  }
}
