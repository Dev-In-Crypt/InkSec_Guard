/**
 * Take safe + critical screenshots using Playwright + live backend data
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const BACKEND = 'https://backend-production-916d.up.railway.app'
const FROM    = '0x5cD5c2bB15fFBe653015377E62926aFa60D5e0a7'
const TOKEN   = '0x641822A13272b91af7D64245871523fD402156d6'
const DRAINER = '0x3Abb24f9016212f997767d8b85feCA98913a5933'

const safeData   = '0x095ea7b3000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000003b9aca00'
const drainData  = '0xece53132000000000000000000000000641822a13272b91af7d64245871523fd402156d6'

async function simulate(to: string, data: string) {
  const res = await fetch(`${BACKEND}/api/v1/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, data, value: '0' }),
  })
  return res.json() as Promise<any>
}

function safeHtml(r: any) {
  const s = r.simulation
  const risk = r.risk
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030712;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:600px}
  header{border-bottom:1px solid #1f2937;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
  h1{font-size:20px;font-weight:700;letter-spacing:-.5px} .ink{color:#818cf8}
  .sub{color:#6b7280;font-size:12px;margin-top:2px}
  .badge{font-size:12px;background:#1f2937;color:#9ca3af;padding:4px 12px;border-radius:9999px}
  main{max-width:760px;margin:0 auto;padding:32px 24px}
  .label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
  .title{color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px;margin-bottom:20px}
  code{color:#818cf8;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{color:#6b7280;text-align:left;padding:4px 8px 8px 0;font-weight:400}
  td{color:#d1d5db;padding:4px 8px 4px 0}
  .warn{color:#d97706;font-size:13px;margin-bottom:4px}
  .alert-safe{background:#052e16;border:1.5px solid #16a34a;border-radius:12px;padding:20px;display:flex;gap:16px}
  .icon-safe{background:#16a34a;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px}
  .score{background:#16a34a;color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;margin-left:10px}
  .heading{font-size:22px;font-weight:700;display:flex;align-items:center}
  .desc{color:#86efac;font-size:13px;margin:8px 0 10px}
  ul{padding-left:20px;color:#86efac;font-size:13px}
  li{margin-bottom:4px}
  .btns{margin-top:16px;display:flex;gap:10px}
  .btn-ok{background:#16a34a;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer}
  .btn-cancel{background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer}
</style></head><body>
<header>
  <div><h1><span class="ink">InkSec</span> Guard</h1><p class="sub">Real-time transaction security for Ink Chain</p></div>
  <span class="badge">Ink Sepolia</span>
</header>
<main>
  <p class="title">Demo Transaction — Safe Approve</p>
  <div class="card">
    <p class="label">Decoded Call</p>
    <code>${s.decodedFunction}</code>
    ${s.approvalChanges?.length ? `
    <p class="label" style="margin-top:18px">Approval Changes</p>
    <table><tr><th>Token</th><th>Spender</th><th>New Allowance</th></tr>
    ${s.approvalChanges.map((a: any) => `<tr><td>${a.symbol || a.token.slice(0,10)+'…'}</td><td style="font-family:monospace;font-size:12px">${a.spender.slice(0,10)}…</td><td>${a.newAllowance}</td></tr>`).join('')}
    </table>` : ''}
    ${s.warnings?.length ? `
    <p class="label" style="margin-top:18px">Simulator Warnings</p>
    ${s.warnings.map((w: string) => `<div class="warn">⚠ ${w}</div>`).join('')}` : ''}
  </div>
  <div class="alert-safe">
    <div class="icon-safe">✓</div>
    <div style="flex:1">
      <div class="heading">LOOKS SAFE<span class="score">Risk Score: ${risk.score}%</span></div>
      <p class="desc">${r.humanReadable}</p>
      <ul>${risk.reasons.map((x: string) => `<li>${x}</li>`).join('')}</ul>
      <div class="btns">
        <button class="btn-ok">Confirm Transaction</button>
        <button class="btn-cancel">Cancel</button>
      </div>
    </div>
  </div>
</main></body></html>`
}

function criticalHtml(r: any) {
  const s = r.simulation
  const risk = r.risk
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030712;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:600px}
  header{border-bottom:1px solid #1f2937;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
  h1{font-size:20px;font-weight:700;letter-spacing:-.5px} .ink{color:#818cf8}
  .sub{color:#6b7280;font-size:12px;margin-top:2px}
  .badge{font-size:12px;background:#1f2937;color:#9ca3af;padding:4px 12px;border-radius:9999px}
  main{max-width:760px;margin:0 auto;padding:32px 24px}
  .label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
  .title{color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}
  .card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px;margin-bottom:20px}
  code{color:#818cf8;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{color:#6b7280;text-align:left;padding:4px 8px 8px 0;font-weight:400}
  td{color:#d1d5db;padding:4px 8px 4px 0} .neg{color:#f87171}
  .warn{color:#d97706;font-size:13px;margin-bottom:4px}
  .revert-tag{display:inline-block;background:#7f1d1d;color:#fca5a5;font-size:12px;padding:3px 10px;border-radius:6px;margin-top:8px}
  .alert-crit{background:#1c0a0a;border:1.5px solid #dc2626;border-radius:12px;padding:20px;display:flex;gap:16px}
  .icon-crit{background:#dc2626;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:20px}
  .score{background:#dc2626;color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;margin-left:10px}
  .heading{font-size:22px;font-weight:700;display:flex;align-items:center}
  .desc{color:#fca5a5;font-size:13px;font-weight:600;margin:8px 0 10px}
  ul{padding-left:20px;color:#fca5a5;font-size:13px}
  li{margin-bottom:4px}
  .btn-cancel{background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:8px;padding:10px 24px;font-size:14px;cursor:pointer;margin-top:16px}
</style></head><body>
<header>
  <div><h1><span class="ink">InkSec</span> Guard</h1><p class="sub">Real-time transaction security for Ink Chain</p></div>
  <span class="badge">Ink Sepolia</span>
</header>
<main>
  <p class="title">Demo Transaction — Drain Attack</p>
  <div class="card">
    <p class="label">Decoded Call</p>
    <code>${s.decodedFunction}</code>
    ${s.balanceChanges?.length ? `
    <p class="label" style="margin-top:18px">Balance Changes</p>
    <table><tr><th>Token</th><th>Before</th><th>After</th><th>Delta</th></tr>
    ${s.balanceChanges.map((b: any) => `<tr><td>${b.symbol}</td><td>${b.before}</td><td>${b.after}</td><td class="neg">${b.delta}</td></tr>`).join('')}
    </table>` : ''}
    <p class="label" style="margin-top:18px">Simulator Warnings</p>
    ${s.warnings.map((w: string) => `<div class="warn">⚠ ${w}</div>`).join('')}
    ${!s.success ? `<span class="revert-tag">eth_call: would revert</span>` : ''}
  </div>
  <div class="alert-crit">
    <div class="icon-crit">☠</div>
    <div style="flex:1">
      <div class="heading">DO NOT SIGN<span class="score">Risk Score: ${risk.score}%</span></div>
      <p class="desc">${r.humanReadable}</p>
      <ul>${risk.reasons.map((x: string) => `<li>${x}</li>`).join('')}</ul>
      <button class="btn-cancel">Cancel (Recommended)</button>
    </div>
  </div>
</main></body></html>`
}

const outDir = resolve('docs/screenshots')

console.log('Fetching simulation results...')
const [safeResult, critResult] = await Promise.all([
  simulate(TOKEN, safeData),
  simulate(DRAINER, drainData),
])
console.log(`safe=${safeResult.risk.level}(${safeResult.risk.score}) crit=${critResult.risk.level}(${critResult.risk.score})`)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1200, height: 900 })

// Safe screenshot
await page.setContent(safeHtml(safeResult), { waitUntil: 'networkidle' })
await page.screenshot({ path: `${outDir}/safe-result.png` })
console.log('✅ docs/screenshots/safe-result.png')

// Critical screenshot
await page.setContent(criticalHtml(critResult), { waitUntil: 'networkidle' })
await page.screenshot({ path: `${outDir}/critical-warning.png` })
console.log('✅ docs/screenshots/critical-warning.png')

await browser.close()
console.log('Done.')
