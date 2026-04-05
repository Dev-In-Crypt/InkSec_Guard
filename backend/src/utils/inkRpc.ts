import { createPublicClient, http, defineChain } from 'viem'
import dotenv from 'dotenv'
dotenv.config()

const rpcUrl = process.env.INK_SEPOLIA_RPC ?? 'https://rpc-gel-sepolia.inkonchain.com'

export const inkSepolia = defineChain({
  id: 763373,
  name: 'Ink Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://explorer-sepolia.inkonchain.com',
      apiUrl: 'https://explorer-sepolia.inkonchain.com/api',
    },
  },
  testnet: true,
})

export const publicClient = createPublicClient({
  chain: inkSepolia,
  transport: http(rpcUrl),
})
