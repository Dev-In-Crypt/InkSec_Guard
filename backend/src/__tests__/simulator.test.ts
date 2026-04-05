import { describe, it, expect, vi, beforeEach } from 'vitest'
import { encodeFunctionData, maxUint256 } from 'viem'
import { ERC20_ABI, DRAINER_ABI } from '../data/abis'

// ── Mock the viem public client ──────────────────────────────────────────────
// We mock inkRpc so tests never hit the network.
vi.mock('../utils/inkRpc', () => ({
  publicClient: {
    call:         vi.fn(),
    readContract: vi.fn(),
  },
  inkSepolia: {},
}))

import { publicClient } from '../utils/inkRpc'
import { simulateTransaction } from '../services/simulator'

// Valid EIP-55 checksum addresses (Hardhat accounts)
const TOKEN   = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const
const DRAINER = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as const
const USER    = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const
const VICTIM  = '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as const

const BALANCE = 10_000n * 10n ** 6n  // 10,000 tUSDC

/** Set up default readContract responses for a token */
function mockTokenReads(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    symbol:    'tUSDC',
    decimals:  6,
    balanceOf: BALANCE,
    allowance: 0n,
    ...overrides,
  }
  vi.mocked(publicClient.readContract).mockImplementation(async ({ functionName }: { functionName: string }) => {
    return defaults[functionName] ?? 0n
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(publicClient.call).mockResolvedValue({ data: '0x' })
})

// ── approve ──────────────────────────────────────────────────────────────────

describe('simulateTransaction — approve(MAX_UINT256)', () => {
  it('returns approvalChange + balance risk warning', async () => {
    mockTokenReads({ allowance: 0n, balanceOf: BALANCE })

    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, maxUint256],
    })
    const result = await simulateTransaction({ from: USER, to: TOKEN, data, value: '0' })

    expect(result.success).toBe(true)
    expect(result.approvalChanges).toHaveLength(1)
    expect(result.approvalChanges[0].newAllowance).toBe('UNLIMITED')
    expect(result.approvalChanges[0].spender).toBe(DRAINER)

    // Should warn about unlimited approval
    expect(result.warnings.some(w => w.includes('Unlimited'))).toBe(true)

    // Should also show potential balance impact
    expect(result.balanceChanges).toHaveLength(1)
    expect(result.balanceChanges[0].delta).toContain('-')
  })

  it('returns no balance change when user balance is 0', async () => {
    mockTokenReads({ balanceOf: 0n })

    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, maxUint256],
    })
    const result = await simulateTransaction({ from: USER, to: TOKEN, data, value: '0' })

    expect(result.balanceChanges).toHaveLength(0)
    expect(result.approvalChanges).toHaveLength(1)
  })

  it('does not warn for finite approval', async () => {
    mockTokenReads()

    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, 100n * 10n ** 6n],
    })
    const result = await simulateTransaction({ from: USER, to: TOKEN, data, value: '0' })

    expect(result.warnings.some(w => w.includes('Unlimited'))).toBe(false)
  })
})

// ── transfer ──────────────────────────────────────────────────────────────────

describe('simulateTransaction — transfer', () => {
  it('shows sender balance decrease and recipient increase', async () => {
    mockTokenReads({ balanceOf: BALANCE })

    const amount = 500n * 10n ** 6n
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'transfer', args: [VICTIM, amount],
    })
    const result = await simulateTransaction({ from: USER, to: TOKEN, data, value: '0' })

    expect(result.balanceChanges).toHaveLength(2)
    const sender    = result.balanceChanges[0]
    const recipient = result.balanceChanges[1]

    expect(sender.delta).toContain('-500')
    expect(recipient.delta).toContain('+500')
  })
})

// ── drain ────────────────────────────────────────────────────────────────────

describe('simulateTransaction — drain()', () => {
  it('shows full balance going to zero + drain warning', async () => {
    mockTokenReads({ balanceOf: BALANCE })

    const data = encodeFunctionData({
      abi: DRAINER_ABI, functionName: 'drain', args: [TOKEN],
    })
    const result = await simulateTransaction({ from: USER, to: DRAINER, data, value: '0' })

    expect(result.balanceChanges).toHaveLength(1)
    expect(result.balanceChanges[0].after).toBe('0')
    expect(result.warnings.some(w => w.includes('drain()'))).toBe(true)
  })
})

// ── drainFrom ────────────────────────────────────────────────────────────────

describe('simulateTransaction — drainFrom()', () => {
  it('shows victim balance going to zero + warning', async () => {
    mockTokenReads({ balanceOf: BALANCE })

    const data = encodeFunctionData({
      abi: DRAINER_ABI, functionName: 'drainFrom', args: [TOKEN, VICTIM],
    })
    const result = await simulateTransaction({ from: USER, to: DRAINER, data, value: '0' })

    expect(result.balanceChanges).toHaveLength(1)
    expect(result.balanceChanges[0].after).toBe('0')
    expect(result.warnings.some(w => w.includes('drainFrom()'))).toBe(true)
  })
})

// ── revert ────────────────────────────────────────────────────────────────────

describe('simulateTransaction — call reverts', () => {
  it('marks success=false and adds revert warning', async () => {
    vi.mocked(publicClient.call).mockRejectedValue(new Error('execution reverted'))
    mockTokenReads()

    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, 100n],
    })
    const result = await simulateTransaction({ from: USER, to: TOKEN, data, value: '0' })

    expect(result.success).toBe(false)
    expect(result.warnings.some(w => w.includes('revert'))).toBe(true)
  })
})

// ── unknown calldata ──────────────────────────────────────────────────────────

describe('simulateTransaction — unknown calldata', () => {
  it('returns unknown function warning', async () => {
    const result = await simulateTransaction({
      from: USER, to: TOKEN, data: '0xdeadbeef', value: '0',
    })
    expect(result.warnings.some(w => w.includes('decode'))).toBe(true)
    expect(result.decodedFunction).toBe('unknown')
  })
})
