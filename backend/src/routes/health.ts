import { Router } from 'express'
import { publicClient } from '../utils/inkRpc'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const block = await publicClient.getBlockNumber()
    res.json({ status: 'ok', chain: 'ink-sepolia', blockNumber: block.toString() })
  } catch {
    res.json({ status: 'ok', chain: 'ink-sepolia', blockNumber: null })
  }
})

export default router
