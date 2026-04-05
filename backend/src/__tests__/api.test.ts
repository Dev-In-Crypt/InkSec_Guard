import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { encodeFunctionData, maxUint256 } from 'viem'
import { ERC20_ABI } from '../data/abis'

// ── Mock all on-chain and network calls ───────────────────────────────────────
vi.mock('../utils/inkRpc', () => ({
  publicClient: {
    call:        vi.fn().mockResolvedValue({ data: '0x' }),
    readContract: vi.fn().mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'symbol')    return 'tUSDC'
      if (functionName === 'decimals')  return 6
      if (functionName === 'balanceOf') return 10_000n * 10n ** 6n
      if (functionName === 'allowance') return 0n
      return 0n
    }),
    getBytecode:    vi.fn().mockResolvedValue('0x6080604052'),
    getBlock:       vi.fn().mockResolvedValue({ number: 1_000_000n }),
    getBlockNumber: vi.fn().mockResolvedValue(1_000_000n),
  },
  inkSepolia: {
    blockExplorers: { default: { apiUrl: 'https://explorer-sepolia.inkonchain.com/api' } },
  },
}))

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok:   true,
  json: async () => ({ status: '1' }),
}))

// Import app AFTER mocks are set up
const { app } = await import('../index')

const FROM    = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const TO      = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const DRAINER = '0x0000000000000000000000000000000000000000'  // matches blacklist

beforeEach(() => vi.clearAllMocks())

describe('GET /api/v1/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.chain).toBe('ink-sepolia')
  })
})

describe('POST /api/v1/simulate', () => {
  it('400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/simulate').send({})
    expect(res.status).toBe(400)
  })

  it('400 on invalid address', async () => {
    const res = await request(app).post('/api/v1/simulate').send({
      from: 'not-an-address', to: TO, data: '0x', value: '0',
    })
    expect(res.status).toBe(400)
  })

  it('400 on invalid hex data', async () => {
    const res = await request(app).post('/api/v1/simulate').send({
      from: FROM, to: TO, data: 'not-hex', value: '0',
    })
    expect(res.status).toBe(400)
  })

  it('200 with valid safe-looking approve', async () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [TO as `0x${string}`, 100n * 10n ** 6n],
    })
    const res = await request(app).post('/api/v1/simulate').send({ from: FROM, to: TO, data, value: '0' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('simulation')
    expect(res.body).toHaveProperty('risk')
    expect(res.body).toHaveProperty('humanReadable')
    expect(res.body.risk.level).toBe('safe')
  })

  it('200 with MAX_UINT approve scores caution or above', async () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [TO as `0x${string}`, maxUint256],
    })
    const res = await request(app).post('/api/v1/simulate').send({ from: FROM, to: TO, data, value: '0' })
    expect(res.status).toBe(200)
    expect(res.body.risk.score).toBeGreaterThanOrEqual(40)
    expect(['caution', 'danger', 'critical']).toContain(res.body.risk.level)
  })

  it('200 with approve to blacklisted address scores critical', async () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [DRAINER as `0x${string}`, maxUint256],
    })
    const res = await request(app).post('/api/v1/simulate').send({ from: FROM, to: DRAINER, data, value: '0' })
    expect(res.status).toBe(200)
    expect(res.body.risk.level).toBe('critical')
    expect(res.body.risk.recommendation).toBe('DO NOT SIGN')
    expect(res.body.humanReadable).toContain('DO NOT SIGN')
  })

  it('response shape is complete', async () => {
    const data = encodeFunctionData({
      abi: ERC20_ABI, functionName: 'approve',
      args: [TO as `0x${string}`, 100n],
    })
    const res = await request(app).post('/api/v1/simulate').send({ from: FROM, to: TO, data, value: '0' })
    const { simulation, risk } = res.body
    // simulation fields
    expect(simulation).toHaveProperty('success')
    expect(simulation).toHaveProperty('balanceChanges')
    expect(simulation).toHaveProperty('approvalChanges')
    expect(simulation).toHaveProperty('decodedFunction')
    expect(simulation).toHaveProperty('warnings')
    // risk fields
    expect(risk).toHaveProperty('score')
    expect(risk).toHaveProperty('level')
    expect(risk).toHaveProperty('reasons')
    expect(risk).toHaveProperty('recommendation')
  })
})
