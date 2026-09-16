#!/usr/bin/env node
/**
 * Attempt Preview/Preprod faucet drip API; if captcha blocks, print browser steps and
 * optionally wait until the wallet shows a positive unshielded balance via indexer.
 *
 * Usage:
 *   node scripts/preview-faucet.mjs [--network=preview] [--wait=180]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { pickNetwork, WALLET_DIR, ARTIFACTS_DIR } from './preview-env.mjs'

const cfg = pickNetwork()
const waitSec = Number(
  (process.argv.find((a) => a.startsWith('--wait=')) || '--wait=180').split('=')[1],
)

const walletPath = new URL(`wallet-${cfg.networkId}.json`, WALLET_DIR)
let wallet
try {
  wallet = JSON.parse(await readFile(walletPath, 'utf8'))
} catch {
  console.error(`[faucet] Missing ${walletPath.pathname}. Run: npm run preview:wallet`)
  process.exit(1)
}

const address = wallet.unshieldedAddress
console.log(`[faucet] Network ${cfg.networkId}`)
console.log(`[faucet] Address ${address}`)

let faucetStatus = 'unknown'
try {
  const health = await fetch(cfg.faucetHealth, { signal: AbortSignal.timeout(10000) })
  console.log(`[faucet] Health ${health.status}: ${await health.text()}`)
} catch (e) {
  console.warn(`[faucet] Health check failed: ${e.message}`)
}

try {
  const res = await fetch(cfg.faucetApi, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': process.env.CAPTCHA_TOKEN || 'XXXX.DUMMY.TOKEN.XXXX',
      ...(process.env.TURNSTILE_HEADER
        ? { 'x-turnstile-token': process.env.TURNSTILE_HEADER }
        : {}),
    },
    body: JSON.stringify({ recipientAddress: address, amount: '1000' }),
    signal: AbortSignal.timeout(20000),
  })
  const body = await res.text()
  console.log(`[faucet] API ${res.status}: ${body}`)
  if (res.ok) faucetStatus = 'api-ok'
  else if (/captcha/i.test(body)) faucetStatus = 'captcha-blocked'
  else faucetStatus = `api-error-${res.status}`
} catch (e) {
  faucetStatus = `api-throw:${e.message}`
  console.warn(`[faucet] API request failed: ${e.message}`)
}

if (faucetStatus !== 'api-ok') {
  console.log('')
  console.log('=== CAPTCHA BLOCK — parent browser automation ===')
  console.log(`Open: ${cfg.faucetUi}`)
  console.log(`Paste unshielded address exactly:`)
  console.log(address)
  console.log('Complete captcha → Request tokens → wait for confirmation tx id.')
  console.log('Then re-run this script with --wait=300 to poll until funds land.')
  console.log('')
}

async function indexerHasFunds(addr) {
  // Best-effort: query unshielded balance via GraphQL if schema supports it.
  // Fallback: always return null (unknown) so wait loop still sleeps for manual confirm.
  const query = {
    query: `query($addr: String!) { unshieldedTransaction(address: $addr) { __typename } }`,
    variables: { addr },
  }
  try {
    const res = await fetch(cfg.indexer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(10000),
    })
    const json = await res.json()
    return json
  } catch {
    return null
  }
}

if (waitSec > 0) {
  console.log(`[faucet] Waiting up to ${waitSec}s for funds (manual/API)…`)
  const deadline = Date.now() + waitSec * 1000
  while (Date.now() < deadline) {
    const probe = await indexerHasFunds(address)
    if (probe && !probe.errors) {
      console.log('[faucet] Indexer responded (schema may not expose balance; check Lace/wallet sync).')
    }
    await new Promise((r) => setTimeout(r, 15000))
    console.log(`[faucet] …still waiting (${Math.max(0, Math.round((deadline - Date.now()) / 1000))}s left)`)
  }
}

await mkdir(ARTIFACTS_DIR, { recursive: true })
const art = {
  networkId: cfg.networkId,
  address,
  faucetStatus,
  faucetUi: cfg.faucetUi,
  faucetApi: cfg.faucetApi,
  at: new Date().toISOString(),
  note:
    faucetStatus === 'captcha-blocked'
      ? 'API drip requires captcha; use browser faucet UI then continue preview:deploy'
      : 'See STATUS.md',
}
const artPath = new URL(`faucet-${cfg.networkId}.json`, ARTIFACTS_DIR)
await writeFile(artPath, JSON.stringify(art, null, 2) + '\n')
console.log(`[faucet] Wrote ${artPath.pathname}`)
console.log(`[faucet] Status: ${faucetStatus}`)
if (faucetStatus === 'captcha-blocked') process.exitCode = 2
