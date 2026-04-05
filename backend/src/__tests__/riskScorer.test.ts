import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SimulationResult } from '../services/simulator'

// ── Mock inkRpc and fetch ────────────────────────────────────────────────────
vi.mock('../utils/inkRpc', () => ({
  publicClient: {
    getBlock:    vi.fn(),
    getBytecode: vi.fn(),
  },
  inkSepolia: {
    blockExplorers: {
      default: { apiUrl: 'https://explorer-sepolia.inkonchain.com/api' },
    },
  },
}))

// Mock global fetch for explorer verification checks
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { publicClient } from '../utils/inkRpc'
import { scoreRisk } from '../services/riskScorer'

// ── Known blacklisted address (matches maliciousAddresses.json — DrainerMock on Ink Sepolia) ──
const BLACKLISTED = '0x3Abb24f9016212f997767d8b85feCA98913a5933' as const
const SAFE_TARGET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const
const EOA_TARGET  = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const

// ── Simulation result builders ────────────────────────────────────────────────

function baseResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    success:         true,
    balanceChanges:  [],
    approvalChanges: [],
    ethDelta:        '0',
    decodedFunction: 'approve(…)',
    warnings:        [],
    ...overrides,
  }
}

function withUnlimitedApproval(spender: string): SimulationResult {
  return baseResult({
    approvalChanges: [{
      token:          SAFE_TARGET,
      spender,
      oldAllowance:   '0',
      newAllowance:   'UNLIMITED',
    }],
  })
}

function withBalanceDrain(): SimulationResult {
  return baseResult({
    balanceChanges: [{
      token:  SAFE_TARGET,
      symbol: 'tUSDC',
      before: '10000',
      after:  '0',
      delta:  '-10000',
    }],
  })
}

// ── Default mock setups ────────────────────────────────────────────────────────

function mockContract(overrides: { code?: string; blockNumber?: bigint } = {}) {
  const code = overrides.code ?? '0x6080604052' // non-empty = contract
  vi.mocked(publicClient.getBytecode).mockResolvedValue(code)
  vi.mocked(publicClient.getBlock).mockResolvedValue({
    number: overrides.blockNumber ?? 1_000_000n,
  } as never)
  // Default: explorer says verified
  mockFetch.mockResolvedValue({
    ok:   true,
    json: async () => ({ status: '1', message: 'OK' }),
  })
}

function mockEOA() {
  vi.mocked(publicClient.getBytecode).mockResolvedValue('0x')
  vi.mocked(publicClient.getBlock).mockResolvedValue({ number: 1_000_000n } as never)
  mockFetch.mockResolvedValue({
    ok:   true,
    json: async () => ({ status: '1' }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Tests: level thresholds ────────────────────────────────────────────────────

describe('scoreRisk — levels', () => {
  it('returns safe (score 0) for a clean, verified contract with no risks', async () => {
    mockContract()
    const result = await scoreRisk(baseResult(), SAFE_TARGET)
    expect(result.score).toBe(0)
    expect(result.level).toBe('safe')
    expect(result.recommendation).toBe('Proceed')
    expect(result.reasons).toHaveLength(0)
  })

  it('returns critical and DO NOT SIGN for blacklisted target', async () => {
    mockContract()
    const result = await scoreRisk(baseResult(), BLACKLISTED)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.level).toBe('critical')
    expect(result.recommendation).toBe('DO NOT SIGN')
    expect(result.reasons.some(r => r.includes('malicious registry'))).toBe(true)
  })
})

// ── Tests: individual rules ────────────────────────────────────────────────────

describe('scoreRisk — Rule 1: blacklist (+80)', () => {
  it('adds 80 points for blacklisted address', async () => {
    mockContract()
    const result = await scoreRisk(baseResult(), BLACKLISTED)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.reasons.some(r => r.includes('malicious registry'))).toBe(true)
  })
})

describe('scoreRisk — Rule 2: unlimited approval (+40)', () => {
  it('adds 40 points for MAX_UINT approval', async () => {
    mockContract()
    const result = await scoreRisk(withUnlimitedApproval(SAFE_TARGET), SAFE_TARGET)
    expect(result.score).toBeGreaterThanOrEqual(40)
    expect(result.reasons.some(r => r.includes('Unlimited'))).toBe(true)
  })
})

describe('scoreRisk — Rule 3: balance drain (+50)', () => {
  it('adds 50 points when balance drops to zero', async () => {
    mockContract()
    const result = await scoreRisk(withBalanceDrain(), SAFE_TARGET)
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.reasons.some(r => r.includes('zero'))).toBe(true)
  })
})

describe('scoreRisk — Rule 5: approval to EOA (+35)', () => {
  it('adds 35 points when approving to an EOA', async () => {
    mockEOA()
    const result = await scoreRisk(withUnlimitedApproval(EOA_TARGET), EOA_TARGET)
    expect(result.score).toBeGreaterThanOrEqual(40 + 35) // unlimited + EOA
    expect(result.reasons.some(r => r.includes('EOA'))).toBe(true)
  })
})

describe('scoreRisk — Rule 6: unverified contract (+20)', () => {
  it('adds 20 points for unverified contract', async () => {
    mockContract()
    // Override fetch to return unverified
    mockFetch.mockResolvedValue({
      ok:   true,
      json: async () => ({ status: '0', message: 'Contract source code not verified' }),
    })
    const result = await scoreRisk(baseResult(), SAFE_TARGET)
    expect(result.score).toBeGreaterThanOrEqual(20)
    expect(result.reasons.some(r => r.includes('verified'))).toBe(true)
  })
})

describe('scoreRisk — Rule 7: simulation revert (+10)', () => {
  it('adds 10 points when simulation reverts', async () => {
    mockContract()
    const result = await scoreRisk(baseResult({ success: false }), SAFE_TARGET)
    expect(result.score).toBeGreaterThanOrEqual(10)
    expect(result.reasons.some(r => r.includes('revert'))).toBe(true)
  })
})

// ── Tests: combined scenarios ──────────────────────────────────────────────────

describe('scoreRisk — combined scenarios', () => {
  it('approve MAX_UINT to blacklisted drainer scores >= 80 (critical)', async () => {
    mockContract()
    const sim = withUnlimitedApproval(BLACKLISTED)
    const result = await scoreRisk(sim, BLACKLISTED)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.level).toBe('critical')
  })

  it('score is capped at 100', async () => {
    mockContract()
    // EOA mock for approval-to-EOA rule
    vi.mocked(publicClient.getBytecode).mockResolvedValue('0x')
    vi.mocked(publicClient.getBlock).mockResolvedValue({ number: 1_000_000n } as never)
    // All rules fire: blacklist + unlimited + balance drain + EOA + revert
    const sim: SimulationResult = {
      success: false,
      balanceChanges: [{ token: BLACKLISTED, symbol: 'tUSDC', before: '100', after: '0', delta: '-100' }],
      approvalChanges: [{ token: BLACKLISTED, spender: BLACKLISTED, oldAllowance: '0', newAllowance: 'UNLIMITED' }],
      ethDelta: '0',
      decodedFunction: 'drain()',
      warnings: [],
    }
    const result = await scoreRisk(sim, BLACKLISTED)
    expect(result.score).toBe(100)
  })
})
