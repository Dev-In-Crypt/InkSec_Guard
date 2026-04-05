import { describe, it, expect } from 'vitest'
import { encodeAbiParameters, encodeFunctionData, parseAbiParameters, maxUint256 } from 'viem'
import { decodeCalldata, isUnlimitedApproval, MAX_UINT256 } from '../services/decoder'
import { ERC20_ABI, DRAINER_ABI } from '../data/abis'

// Valid EIP-55 checksum addresses (Hardhat accounts)
const SPENDER  = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as const  // drainer
const VICTIM   = '0x90F79bf6EB2c4f870365E785982E1f101E93b906' as const
const TOKEN    = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const
const AMOUNT   = 1_000n * 10n ** 6n  // 1000 tUSDC

describe('decodeCalldata', () => {

  it('decodes ERC-20 approve with finite amount', () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [SPENDER, AMOUNT],
    })
    const result = decodeCalldata(data)
    expect(result).not.toBeNull()
    expect(result!.functionName).toBe('approve')
    expect(result!.args[0]).toBe(SPENDER)
    expect(result!.args[1]).toBe(AMOUNT)
    expect(result!.humanReadable).toContain('approve')
    expect(result!.humanReadable).toContain('1000')
  })

  it('decodes ERC-20 approve with MAX_UINT256 and labels it UNLIMITED', () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve', args: [SPENDER, maxUint256],
    })
    const result = decodeCalldata(data)
    expect(result!.functionName).toBe('approve')
    expect(result!.humanReadable).toContain('UNLIMITED')
  })

  it('decodes ERC-20 transfer', () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'transfer', args: [VICTIM, AMOUNT],
    })
    const result = decodeCalldata(data)
    expect(result!.functionName).toBe('transfer')
    expect(result!.humanReadable).toContain('transfer')
  })

  it('decodes ERC-20 transferFrom', () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'transferFrom', args: [VICTIM, SPENDER, AMOUNT],
    })
    const result = decodeCalldata(data)
    expect(result!.functionName).toBe('transferFrom')
  })

  it('decodes DrainerMock drain()', () => {
    const data = encodeFunctionData({
      abi: DRAINER_ABI, functionName: 'drain', args: [TOKEN],
    })
    const result = decodeCalldata(data)
    expect(result!.functionName).toBe('drain')
    expect(result!.humanReadable).toContain('drain')
  })

  it('decodes DrainerMock drainFrom()', () => {
    const data = encodeFunctionData({
      abi: DRAINER_ABI, functionName: 'drainFrom', args: [TOKEN, VICTIM],
    })
    const result = decodeCalldata(data)
    expect(result!.functionName).toBe('drainFrom')
    expect(result!.humanReadable).toContain('drainFrom')
    expect(result!.humanReadable.toLowerCase()).toContain(VICTIM.toLowerCase())
  })

  it('returns null for unknown calldata', () => {
    const result = decodeCalldata('0xdeadbeef')
    expect(result).toBeNull()
  })

  it('returns null for empty calldata', () => {
    const result = decodeCalldata('0x')
    expect(result).toBeNull()
  })
})

describe('isUnlimitedApproval', () => {
  it('returns true for MAX_UINT256', () => {
    expect(isUnlimitedApproval(MAX_UINT256)).toBe(true)
  })

  it('returns true for amounts above threshold (10^30)', () => {
    expect(isUnlimitedApproval(10n ** 30n)).toBe(true)
  })

  it('returns false for finite amounts', () => {
    expect(isUnlimitedApproval(1_000n * 10n ** 6n)).toBe(false)
    expect(isUnlimitedApproval(10n ** 29n)).toBe(false)
  })
})
