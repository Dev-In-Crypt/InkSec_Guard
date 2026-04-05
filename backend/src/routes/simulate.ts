import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { isAddress, type Address, type Hex } from 'viem'
import { simulateTransaction } from '../services/simulator'
import { scoreRisk } from '../services/riskScorer'

const router = Router()

// ── Request schema ────────────────────────────────────────────────────────────

const SimulateBodySchema = z.object({
  from:  z.string().refine(isAddress, { message: 'Invalid "from" address' }),
  to:    z.string().refine(isAddress, { message: 'Invalid "to" address' }),
  data:  z.string().regex(/^0x[0-9a-fA-F]*$/, { message: 'Invalid hex "data"' }),
  value: z.string().default('0'),
})

// ── Human-readable summary ────────────────────────────────────────────────────

function buildHumanReadable(
  decodedFunction: string,
  score: number,
  reasons: string[],
  toAddress: string,
  recommendation: string,
): string {
  const topReason = reasons[0] ?? 'No specific risk detected.'
  return (
    `Transaction: ${decodedFunction}. ` +
    `Target: ${toAddress}. ` +
    `Risk Score: ${score}%. ` +
    `${recommendation}. ` +
    topReason
  )
}

// ── POST /api/v1/simulate ─────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  // Validate input
  const parsed = SimulateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { from, to, data, value } = parsed.data

  try {
    // Run simulation and risk scoring in sequence (risk depends on simulation result)
    const simulation = await simulateTransaction({
      from:  from as Address,
      to:    to   as Address,
      data:  data as Hex,
      value,
    })

    const risk = await scoreRisk(simulation, to as Address)

    const humanReadable = buildHumanReadable(
      simulation.decodedFunction,
      risk.score,
      risk.reasons,
      to,
      risk.recommendation,
    )

    res.json({ simulation, risk, humanReadable })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    res.status(500).json({ error: message })
  }
})

export default router
