import { type Address, getAddress } from 'viem'
import { publicClient, inkSepolia } from '../utils/inkRpc'
import { type SimulationResult } from './simulator'
import maliciousAddresses from '../data/maliciousAddresses.json' with { type: 'json' }

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'caution' | 'danger' | 'critical'

export interface RiskScore {
  score:          number     // 0–100
  level:          RiskLevel
  reasons:        string[]
  recommendation: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

// Rule weights — additive, capped at 100
const POINTS = {
  BLACKLISTED:         80,
  UNLIMITED_APPROVAL:  40,
  NEW_CONTRACT:        30,  // deployed < 24h ago
  BALANCE_DRAIN:       50,  // token balance drops to 0 or approaches 0
  NOT_VERIFIED:        20,
  APPROVAL_TO_EOA:     35,
  SIMULATION_REVERT:   10,
} as const

// Level thresholds
const THRESHOLDS = { SAFE: 20, CAUTION: 50, DANGER: 79 } as const

const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Pre-normalised blacklist for O(1) lookup
const BLACKLIST = new Set(
  maliciousAddresses.map((e) => e.address.toLowerCase())
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function toLevel(score: number): RiskLevel {
  if (score <= THRESHOLDS.SAFE)   return 'safe'
  if (score <= THRESHOLDS.CAUTION) return 'caution'
  if (score <= THRESHOLDS.DANGER)  return 'danger'
  return 'critical'
}

function toRecommendation(level: RiskLevel): string {
  switch (level) {
    case 'safe':     return 'Proceed'
    case 'caution':  return 'Review carefully'
    case 'danger':   return 'Avoid unless you are certain'
    case 'critical': return 'DO NOT SIGN'
  }
}

/** Returns the block timestamp (ms) when the contract at `address` was first deployed.
 *  Returns null if it cannot be determined (EOA, RPC error, etc.). */
async function getContractDeployTimestamp(address: Address): Promise<number | null> {
  try {
    // Binary-search approach: find the earliest block that has code at this address.
    // For speed on testnet, we use a simpler heuristic: check the creation tx via
    // eth_getCode existence and then fetch the block via a low-level eth_call.
    // Full binary search is available but expensive; we just check recent blocks.
    const latest = await publicClient.getBlock({ blockTag: 'latest' })
    const latestNum = latest.number ?? 0n

    // Check if code existed 1 day ago (≈ 43200 blocks at 2s/block)
    const blocksPerDay = 43200n
    const checkBlock = latestNum > blocksPerDay ? latestNum - blocksPerDay : 0n

    const codeAtOldBlock = await publicClient.getBytecode({
      address,
      blockNumber: checkBlock,
    })

    if (codeAtOldBlock && codeAtOldBlock !== '0x') {
      // Contract existed > 1 day ago — not new
      return null
    }

    // Contract has code now but not in the old block — deployed in the last 24h
    // Return "now minus epsilon" to trigger the new-contract rule
    return Date.now() - 1000  // 1s ago — definitely within 24h window
  } catch {
    return null
  }
}

/** Returns true if `address` has no deployed bytecode (is an EOA). */
async function isEOA(address: Address): Promise<boolean> {
  try {
    const code = await publicClient.getBytecode({ address })
    return !code || code === '0x'
  } catch {
    return false
  }
}

/** Returns true if the contract is NOT verified on the Ink Sepolia block explorer. */
async function isNotVerified(address: Address): Promise<boolean> {
  const explorerApi = inkSepolia.blockExplorers?.default.apiUrl
  if (!explorerApi) return false

  try {
    const url = `${explorerApi}?module=contract&action=getabi&address=${address}`
    const res  = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return true
    const json = await res.json() as { status: string; message: string }
    // Blockscout returns status "0" when ABI is not available (unverified)
    return json.status !== '1'
  } catch {
    // If the explorer is unreachable, don't penalise
    return false
  }
}

// ── Core scoring ──────────────────────────────────────────────────────────────

export async function scoreRisk(
  simulation: SimulationResult,
  targetAddress: Address,
): Promise<RiskScore> {
  let score   = 0
  const reasons: string[] = []

  const targetLower = targetAddress.toLowerCase()

  // ── Rule 1: Blacklisted address (+80) ────────────────────────────
  if (BLACKLIST.has(targetLower)) {
    score += POINTS.BLACKLISTED
    const entry = maliciousAddresses.find(
      (e) => e.address.toLowerCase() === targetLower
    )
    reasons.push(
      `Target address is in the malicious registry${entry ? ` (${entry.label})` : ''}.`
    )
  }

  // ── Rule 2: Unlimited approval (+40) ─────────────────────────────
  const unlimitedApproval = simulation.approvalChanges.some(
    (a) => a.newAllowance === 'UNLIMITED'
  )
  if (unlimitedApproval) {
    score += POINTS.UNLIMITED_APPROVAL
    const spender = simulation.approvalChanges.find(
      (a) => a.newAllowance === 'UNLIMITED'
    )?.spender ?? targetAddress
    reasons.push(
      `Unlimited token approval granted to ${spender}. ` +
      'The spender can drain your full balance at any time.'
    )
  }

  // ── Rule 3: Token balance drops to zero (+50) ─────────────────────
  const balanceDrained = simulation.balanceChanges.some(
    (b) => b.after === '0' || b.after.startsWith('0 (')
  )
  if (balanceDrained) {
    score += POINTS.BALANCE_DRAIN
    reasons.push('Your token balance would be reduced to zero by this transaction.')
  }

  // ── Async on-chain checks (run in parallel for speed) ─────────────
  const [deployTs, eoaResult, notVerified] = await Promise.all([
    getContractDeployTimestamp(targetAddress),
    isEOA(targetAddress),
    isNotVerified(targetAddress),
  ])

  // ── Rule 4: Contract deployed < 24h ago (+30) ─────────────────────
  if (deployTs !== null && Date.now() - deployTs < ONE_DAY_MS) {
    score += POINTS.NEW_CONTRACT
    reasons.push('Target contract was deployed less than 24 hours ago.')
  }

  // ── Rule 5: Approval to an EOA (+35) ─────────────────────────────
  if (eoaResult && unlimitedApproval) {
    score += POINTS.APPROVAL_TO_EOA
    reasons.push(
      `Target ${targetAddress} is an externally-owned account (EOA), not a contract. ` +
      'Approving tokens to an EOA is highly unusual.'
    )
  }

  // ── Rule 6: Contract not verified on explorer (+20) ───────────────
  if (!eoaResult && notVerified) {
    score += POINTS.NOT_VERIFIED
    reasons.push('Target contract source code is not verified on the block explorer.')
  }

  // ── Rule 7: Simulation reverts (+10) ─────────────────────────────
  if (!simulation.success) {
    score += POINTS.SIMULATION_REVERT
    reasons.push('This transaction would revert on-chain (suspicious or broken call).')
  }

  // ── Build final result ────────────────────────────────────────────
  const finalScore = clamp(score)
  const level      = toLevel(finalScore)

  return {
    score:          finalScore,
    level,
    reasons,
    recommendation: toRecommendation(level),
  }
}
