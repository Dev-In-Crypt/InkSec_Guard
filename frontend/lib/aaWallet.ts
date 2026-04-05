'use client'

import { defineChain, type Address } from 'viem'
import { createPublicClient, http } from 'viem'
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk'
import { KERNEL_V3_1 } from '@zerodev/sdk/constants'
import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
  PasskeyValidatorContractVersion,
} from '@zerodev/passkey-validator'

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
  address: `0x${string}`
  client:  ReturnType<typeof createKernelAccountClient>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTRY_POINT = {
  address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as Address,
  version: '0.7' as const,
}

const PASSKEY_SERVER_URL =
  process.env.NEXT_PUBLIC_PASSKEY_SERVER_URL ??
  'https://passkeys.zerodev.app/api/v3/6ca9c11b-8a5a-483d-bca9-d7d194662902'

// ── Create a smart account using WebAuthn / passkey ───────────────────────────

export async function createPasskeyAccount(
  mode: 'register' | 'login',
  bundlerUrl: string,
  paymasterUrl?: string,
): Promise<SmartAccountInfo> {
  const publicClient = createPublicClient({
    chain:     inkSepolia,
    transport: http(),
  })

  const webAuthnKey = await toWebAuthnKey({
    passkeyName:      'InkSec Guard',
    passkeyServerUrl: PASSKEY_SERVER_URL,
    mode:             mode === 'register' ? WebAuthnMode.Register : WebAuthnMode.Login,
  })

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint:               ENTRY_POINT,
    kernelVersion:            KERNEL_V3_1,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_2_UNPATCHED,
  })

  const account = await createKernelAccount(publicClient, {
    plugins:       { sudo: passkeyValidator },
    entryPoint:    ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  })

  const kernelClient = createKernelAccountClient({
    account,
    chain:            inkSepolia,
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
