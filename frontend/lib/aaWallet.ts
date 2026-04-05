'use client'

import { defineChain } from 'viem'
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk'
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import { KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ── Ink Sepolia chain definition ──────────────────────────────────────────────

export const inkSepolia = defineChain({
  id: 763373,
  name: 'Ink Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer-sepolia.inkonchain.com',
    },
  },
  testnet: true,
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SmartAccountInfo {
  address:   `0x${string}`
  client:    ReturnType<typeof createKernelAccountClient>
}

// ── Create a smart account from a private key (demo only) ────────────────────
// In production this would use a social login signer (passkey, Google, etc.)

export async function createSmartAccount(
  privateKey: `0x${string}`,
  bundlerUrl: string,
  paymasterUrl?: string,
): Promise<SmartAccountInfo> {
  const signer = privateKeyToAccount(privateKey)

  const publicClient = createPublicClient({
    chain:     inkSepolia,
    transport: http(),
  })

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer,
    kernelVersion: KERNEL_V3_1,
    entryPoint:    { address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', version: '0.7' },
  })

  const account = await createKernelAccount(publicClient, {
    plugins:       { sudo: ecdsaValidator },
    kernelVersion: KERNEL_V3_1,
    entryPoint:    { address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032', version: '0.7' },
  })

  const kernelClient = createKernelAccountClient({
    account,
    chain:     inkSepolia,
    bundlerTransport: http(bundlerUrl),
    ...(paymasterUrl
      ? {
          paymaster: createZeroDevPaymasterClient({
            chain:     inkSepolia,
            transport: http(paymasterUrl),
          }),
        }
      : {}),
  })

  return {
    address: account.address,
    client:  kernelClient,
  }
}
