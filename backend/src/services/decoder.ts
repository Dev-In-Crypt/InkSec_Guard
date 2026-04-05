import { decodeFunctionData, type Hex, formatUnits } from 'viem'
import { ERC20_ABI, DRAINER_ABI } from '../data/abis'

export interface DecodedCall {
  functionName: string
  args: readonly unknown[]
  humanReadable: string
}

const MAX_UINT256 = 2n ** 256n - 1n
// Threshold above which we treat an approval as "unlimited" (> 10^30)
const UNLIMITED_THRESHOLD = 10n ** 30n

/** Try to decode calldata against known ABIs. Returns null if unrecognised. */
export function decodeCalldata(data: Hex): DecodedCall | null {
  // Try ERC-20 ABI first (most common)
  for (const abi of [ERC20_ABI, DRAINER_ABI] as const) {
    try {
      const { functionName, args } = decodeFunctionData({ abi, data })
      return {
        functionName,
        args,
        humanReadable: buildHumanReadable(functionName, args),
      }
    } catch {
      // Not this ABI — try next
    }
  }
  return null
}

function buildHumanReadable(fn: string, args: readonly unknown[]): string {
  switch (fn) {
    case 'approve': {
      const [spender, amount] = args as [string, bigint]
      const amountStr = amount >= UNLIMITED_THRESHOLD
        ? 'UNLIMITED'
        : formatUnits(amount, 6) + ' tUSDC'
      return `approve(${spender}, ${amountStr})`
    }
    case 'transfer': {
      const [to, amount] = args as [string, bigint]
      return `transfer(${to}, ${formatUnits(amount, 6)} tUSDC)`
    }
    case 'transferFrom': {
      const [from, to, amount] = args as [string, string, bigint]
      return `transferFrom(${from}, ${to}, ${formatUnits(amount, 6)} tUSDC)`
    }
    case 'drain': {
      const [token] = args as [string]
      return `drain(token=${token})`
    }
    case 'drainFrom': {
      const [token, victim] = args as [string, string]
      return `drainFrom(token=${token}, victim=${victim})`
    }
    default:
      return `${fn}(${(args as unknown[]).join(', ')})`
  }
}

/** Returns true if the amount represents an unlimited (max) approval. */
export function isUnlimitedApproval(amount: bigint): boolean {
  return amount >= UNLIMITED_THRESHOLD
}

export { MAX_UINT256 }
