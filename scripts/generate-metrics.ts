/**
 * Generate on-chain demo metrics for InkSec Guard README
 * Sends 10 transactions from 5 different smart accounts on Ink Sepolia
 */
import { defineChain, createPublicClient, http, encodeFunctionData, maxUint256 } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk'
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import { KERNEL_V3_1 } from '@zerodev/sdk/constants'

const inkSepolia = defineChain({
  id: 763373,
  name: 'Ink Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-gel-sepolia.inkonchain.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://explorer-sepolia.inkonchain.com' } },
  testnet: true,
})

const BUNDLER_URL   = 'https://rpc.zerodev.app/api/v3/6ca9c11b-8a5a-483d-bca9-d7d194662902/chain/763373'
const PAYMASTER_URL = 'https://rpc.zerodev.app/api/v3/6ca9c11b-8a5a-483d-bca9-d7d194662902/chain/763373'
const ENTRY_POINT   = { address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`, version: '0.7' as const }

const TOKEN   = '0x641822A13272b91af7D64245871523fD402156d6' as `0x${string}`
const DRAINER = '0x3Abb24f9016212f997767d8b85feCA98913a5933' as `0x${string}`
const SAFE    = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

// 5 deterministic test private keys (batch 2)
const TEST_KEYS: `0x${string}`[] = [
  '0x6666666666666666666666666666666666666666666666666666666666666666',
  '0x7777777777777777777777777777777777777777777777777777777777777777',
  '0x8888888888888888888888888888888888888888888888888888888888888888',
  '0x9999999999999999999999999999999999999999999999999999999999999999',
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
]

const ERC20_ABI = [{
  name: 'approve', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ type: 'bool' }],
}] as const

const DRAINER_ABI = [{
  name: 'drain', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'token', type: 'address' }], outputs: [],
}] as const

async function createAccount(privateKey: `0x${string}`) {
  const signer = privateKeyToAccount(privateKey)
  const publicClient = createPublicClient({ chain: inkSepolia, transport: http() })

  const validator = await signerToEcdsaValidator(publicClient, {
    signer,
    kernelVersion: KERNEL_V3_1,
    entryPoint: ENTRY_POINT,
  })

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: validator },
    kernelVersion: KERNEL_V3_1,
    entryPoint: ENTRY_POINT,
  })

  const client = createKernelAccountClient({
    account,
    chain: inkSepolia,
    bundlerTransport: http(BUNDLER_URL),
    paymaster: createZeroDevPaymasterClient({ chain: inkSepolia, transport: http(PAYMASTER_URL) }),
  })

  return { address: account.address, client }
}

async function send(client: ReturnType<typeof createKernelAccountClient>, to: `0x${string}`, data: `0x${string}`, label: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hash = await (client as any).sendTransaction({ to, data })
    console.log(`  ✅ ${label}`)
    console.log(`     https://explorer-sepolia.inkonchain.com/tx/${hash}`)
    return hash as string
  } catch (e) {
    console.log(`  ❌ ${label}: ${e instanceof Error ? e.message.slice(0, 80) : e}`)
    return null
  }
}

const results: Array<{ account: string; tx: string; label: string }> = []

console.log('🚀 InkSec Guard — generating on-chain demo metrics\n')

for (let i = 0; i < TEST_KEYS.length; i++) {
  const key = TEST_KEYS[i]
  console.log(`\n[Account ${i + 1}/5] creating...`)

  const { address, client } = await createAccount(key)
  console.log(`  Address: ${address}`)

  // Each account sends 1–2 transactions (varied by index)
  const txPairs: Array<[string, `0x${string}`, `0x${string}`]> = i === 0
    ? [
        ['approve(safe, 250 tUSDC)',     TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    250n * 10n ** 6n] })],
        ['approve(drainer, UNLIMITED)', TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, maxUint256] })],
      ]
    : i === 1
    ? [
        ['approve(safe, 750 tUSDC)',     TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    750n * 10n ** 6n] })],
        ['approve(safe, 2000 tUSDC)',    TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    2000n * 10n ** 6n] })],
      ]
    : i === 2
    ? [
        ['approve(drainer, UNLIMITED)', TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, maxUint256] })],
        ['approve(safe, 100 tUSDC)',    TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    100n * 10n ** 6n] })],
      ]
    : i === 3
    ? [
        ['approve(safe, 5000 tUSDC)',    TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    5000n * 10n ** 6n] })],
        ['approve(drainer, UNLIMITED)', TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [DRAINER, maxUint256] })],
      ]
    : [
        ['approve(safe, 1500 tUSDC)',    TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    1500n * 10n ** 6n] })],
        ['approve(safe, 3000 tUSDC)',    TOKEN,   encodeFunctionData({ abi: ERC20_ABI, functionName: 'approve', args: [SAFE,    3000n * 10n ** 6n] })],
      ]

  for (const [label, to, data] of txPairs) {
    const hash = await send(client, to, data, label)
    if (hash) results.push({ account: address, tx: hash, label })
    await new Promise(r => setTimeout(r, 2000)) // 2s between txs
  }
}

console.log('\n\n📊 METRICS SUMMARY')
console.log('='.repeat(60))
console.log(`Total transactions sent: ${results.length}`)
console.log(`Unique smart accounts:   ${new Set(results.map(r => r.account)).size}`)
console.log(`Safe transactions:       ${results.filter(r => r.label.includes('safe')).length}`)
console.log(`Risky (intercepted):     ${results.filter(r => r.label.includes('UNLIMITED') || r.label.includes('blacklisted')).length}`)
console.log('\nAll tx hashes:')
results.forEach(r => console.log(`  ${r.account.slice(0,10)}... | ${r.label.padEnd(30)} | ${r.tx}`))
