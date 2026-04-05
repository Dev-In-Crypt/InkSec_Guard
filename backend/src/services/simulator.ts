import { type Address, type Hex, formatUnits } from 'viem'
import { publicClient } from '../utils/inkRpc'
import { ERC20_ABI } from '../data/abis'
import { decodeCalldata, isUnlimitedApproval } from './decoder'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SimulateParams {
  from: Address
  to:   Address
  data: Hex
  value: string
}

export interface BalanceChange {
  token:   string
  symbol:  string
  before:  string
  after:   string
  delta:   string
}

export interface ApprovalChange {
  token:          string
  spender:        string
  oldAllowance:   string
  newAllowance:   string
}

export interface SimulationResult {
  success:         boolean
  balanceChanges:  BalanceChange[]
  approvalChanges: ApprovalChange[]
  ethDelta:        string
  decodedFunction: string
  warnings:        string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function tryReadSymbol(token: Address): Promise<string> {
  try {
    return await publicClient.readContract({
      address: token, abi: ERC20_ABI, functionName: 'symbol',
    }) as string
  } catch {
    return '???'
  }
}

async function tryReadBalance(token: Address, account: Address): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [account],
    }) as bigint
  } catch {
    return 0n
  }
}

async function tryReadAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: token, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender],
    }) as bigint
  } catch {
    return 0n
  }
}

async function tryReadDecimals(token: Address): Promise<number> {
  try {
    return await publicClient.readContract({
      address: token, abi: ERC20_ABI, functionName: 'decimals',
    }) as number
  } catch {
    return 18
  }
}

function formatAmount(amount: bigint, decimals: number): string {
  if (amount >= 2n ** 255n) return 'UNLIMITED'
  return formatUnits(amount, decimals)
}

// ── Core simulation logic ────────────────────────────────────────────────────

export async function simulateTransaction(params: SimulateParams): Promise<SimulationResult> {
  const balanceChanges:  BalanceChange[]  = []
  const approvalChanges: ApprovalChange[] = []
  const warnings:        string[]         = []

  // 1. Try to execute the call via eth_call to detect reverts
  let callSuccess = true
  try {
    await publicClient.call({
      account: params.from,
      to:      params.to,
      data:    params.data,
      value:   BigInt(params.value ?? '0'),
    })
  } catch {
    callSuccess = false
    warnings.push('Transaction would revert on-chain')
  }

  // 2. Decode calldata
  const decoded = decodeCalldata(params.data)
  const decodedFunction = decoded?.humanReadable ?? 'unknown'

  if (!decoded) {
    warnings.push('Could not decode calldata — unknown function')
    return {
      success: callSuccess,
      balanceChanges,
      approvalChanges,
      ethDelta: '0',
      decodedFunction,
      warnings,
    }
  }

  const { functionName, args } = decoded

  // 3. Compute expected state changes per function type
  switch (functionName) {

    case 'approve': {
      const [spender, amount] = args as [Address, bigint]
      const token    = params.to
      const decimals = await tryReadDecimals(token)
      const symbol   = await tryReadSymbol(token)
      const oldAllowance = await tryReadAllowance(token, params.from, spender)

      approvalChanges.push({
        token,
        spender,
        oldAllowance: formatAmount(oldAllowance, decimals),
        newAllowance: formatAmount(amount, decimals),
      })

      if (isUnlimitedApproval(amount)) {
        warnings.push(
          `Unlimited ${symbol} approval granted to ${spender}. ` +
          'This allows the spender to transfer your entire balance at any time.'
        )
      }

      // Check whether the token balance could be drained after this approval
      const balance = await tryReadBalance(token, params.from)
      if (balance > 0n && isUnlimitedApproval(amount)) {
        balanceChanges.push({
          token,
          symbol,
          before: formatAmount(balance, decimals),
          after:  '0 (if spender drains)',
          delta:  `-${formatAmount(balance, decimals)}`,
        })
      }
      break
    }

    case 'transfer': {
      const [to, amount] = args as [Address, bigint]
      const token    = params.to
      const decimals = await tryReadDecimals(token)
      const symbol   = await tryReadSymbol(token)
      const before   = await tryReadBalance(token, params.from)
      const after    = before >= amount ? before - amount : 0n

      balanceChanges.push({
        token, symbol,
        before: formatAmount(before, decimals),
        after:  formatAmount(after,  decimals),
        delta:  `-${formatAmount(amount, decimals)}`,
      })

      // Also show recipient side
      const recipientBalance = await tryReadBalance(token, to)
      balanceChanges.push({
        token, symbol: `${symbol} (recipient ${to})`,
        before: formatAmount(recipientBalance, decimals),
        after:  formatAmount(recipientBalance + amount, decimals),
        delta:  `+${formatAmount(amount, decimals)}`,
      })
      break
    }

    case 'transferFrom': {
      const [from, to, amount] = args as [Address, Address, bigint]
      const token    = params.to
      const decimals = await tryReadDecimals(token)
      const symbol   = await tryReadSymbol(token)
      const before   = await tryReadBalance(token, from)
      const after    = before >= amount ? before - amount : 0n

      balanceChanges.push({
        token, symbol,
        before: formatAmount(before, decimals),
        after:  formatAmount(after,  decimals),
        delta:  `-${formatAmount(amount, decimals)}`,
      })

      const allowance = await tryReadAllowance(token, from, params.from)
      if (allowance < amount) {
        warnings.push('Caller has insufficient allowance — would revert')
      }
      break
    }

    case 'drain': {
      const [token] = args as [Address]
      const drainerAddress = params.to
      const decimals = await tryReadDecimals(token)
      const symbol   = await tryReadSymbol(token)
      const balance  = await tryReadBalance(token, params.from)

      balanceChanges.push({
        token, symbol,
        before: formatAmount(balance, decimals),
        after:  '0',
        delta:  `-${formatAmount(balance, decimals)}`,
      })
      warnings.push(
        `Calling drain() on ${drainerAddress} will transfer your entire ` +
        `${symbol} balance to the contract owner.`
      )
      break
    }

    case 'drainFrom': {
      const [token, victim] = args as [Address, Address]
      const drainerAddress = params.to
      const decimals = await tryReadDecimals(token)
      const symbol   = await tryReadSymbol(token)
      const balance  = await tryReadBalance(token, victim)

      balanceChanges.push({
        token, symbol: `${symbol} (victim: ${victim})`,
        before: formatAmount(balance, decimals),
        after:  '0',
        delta:  `-${formatAmount(balance, decimals)}`,
      })
      warnings.push(
        `drainFrom() on ${drainerAddress} will steal all ${symbol} from ${victim}.`
      )
      break
    }

    default:
      warnings.push(`Unrecognised function: ${functionName}`)
  }

  return {
    success: callSuccess,
    balanceChanges,
    approvalChanges,
    ethDelta: '0',
    decodedFunction,
    warnings,
  }
}
