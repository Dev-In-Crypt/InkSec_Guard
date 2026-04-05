import { test, expect } from '@playwright/test'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'

// ── UI tests ──────────────────────────────────────────────────────────────────

test.describe('InkSec Guard — UI', () => {
  test('homepage loads with correct title and branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/InkSec Guard/)
    await expect(page.locator('h1')).toContainText('InkSec')
    await expect(page.locator('h1')).toContainText('Guard')
  })

  test('shows network badge for Ink Sepolia', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ink Sepolia')).toBeVisible()
  })

  test('shows Connect Smart Wallet button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Connect Smart Wallet/i })).toBeVisible()
  })

  test('shows "How InkSec Guard works" section when wallet not connected', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('How InkSec Guard works')).toBeVisible()
    await expect(page.getByText('eth_call')).toBeVisible()
  })

  test('shows 5-step security flow explanation', async ({ page }) => {
    await page.goto('/')
    const steps = page.locator('ol li')
    await expect(steps).toHaveCount(5)
  })
})

// ── Backend API tests (run against live backend) ──────────────────────────────

test.describe('InkSec Guard — Backend API', () => {
  test('GET /api/v1/health returns ok', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/v1/health`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.chain).toBe('ink-sepolia')
    expect(typeof body.blockNumber).toBe('string')
  })

  test('POST /simulate — safe approve returns caution or safe', async ({ request }) => {
    // approve(0xf39Fd6...safe, 1000 tUSDC) on the deployed MockERC20
    const res = await request.post(`${BACKEND_URL}/api/v1/simulate`, {
      data: {
        from:  '0xc002CEa0F2738723A52d965af56c7265d15CA175',
        to:    '0x641822A13272b91af7D64245871523fD402156d6',
        data:  '0x095ea7b3000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000003b9aca00',
        value: '0',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.risk.score).toBeLessThan(80)
    expect(['safe', 'caution']).toContain(body.risk.level)
    expect(body.simulation.success).toBe(true)
  })

  test('POST /simulate — unlimited approve to DrainerMock returns critical', async ({ request }) => {
    // approve(DrainerMock, MAX_UINT) on MockERC20
    const res = await request.post(`${BACKEND_URL}/api/v1/simulate`, {
      data: {
        from:  '0xc002CEa0F2738723A52d965af56c7265d15CA175',
        to:    '0x641822A13272b91af7D64245871523fD402156d6',
        data:  '0x095ea7b30000000000000000000000003abb24f9016212f997767d8b85feca98913a5933ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        value: '0',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.risk.score).toBe(100)
    expect(body.risk.level).toBe('critical')
    expect(body.risk.recommendation).toBe('DO NOT SIGN')
    expect(body.simulation.approvalChanges[0].newAllowance).toBe('UNLIMITED')
  })

  test('POST /simulate — direct drain() on DrainerMock returns critical with blacklist reason', async ({ request }) => {
    // drain(MockERC20) called on DrainerMock address
    const res = await request.post(`${BACKEND_URL}/api/v1/simulate`, {
      data: {
        from:  '0xc002CEa0F2738723A52d965af56c7265d15CA175',
        to:    '0x3Abb24f9016212f997767d8b85feCA98913a5933',
        data:  '0xf0b9e5ba000000000000000000000000641822a13272b91af7d64245871523fd402156d6',
        value: '0',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.risk.score).toBe(100)
    expect(body.risk.level).toBe('critical')
    expect(body.risk.reasons.some((r: string) => r.includes('malicious registry'))).toBe(true)
  })

  test('POST /simulate — returns humanReadable string', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/simulate`, {
      data: {
        from:  '0xc002CEa0F2738723A52d965af56c7265d15CA175',
        to:    '0x3Abb24f9016212f997767d8b85feCA98913a5933',
        data:  '0xf0b9e5ba000000000000000000000000641822a13272b91af7d64245871523fd402156d6',
        value: '0',
      },
    })
    const body = await res.json()
    expect(typeof body.humanReadable).toBe('string')
    expect(body.humanReadable.length).toBeGreaterThan(20)
    expect(body.humanReadable).toContain('DO NOT SIGN')
  })

  test('POST /simulate — rejects invalid body with 400', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/v1/simulate`, {
      data: { from: 'not-an-address', to: '0x123', data: 'bad', value: '0' },
    })
    expect(res.status()).toBe(400)
  })
})
