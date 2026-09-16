#!/usr/bin/env node
/**
 * Generate (or reuse) a Preview/Preprod funding wallet seed and print mn_addr_* address.
 * Does not require Docker. Saves seed under .preview-wallet/ (gitignored).
 *
 * Usage:
 *   node scripts/preview-wallet.mjs [--network=preview|preprod]
 *   WALLET_SEED=<hex> node scripts/preview-wallet.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { WebSocket } from 'ws'
import { pickNetwork, WALLET_DIR } from './preview-env.mjs'

;(globalThis).WebSocket = WebSocket

const cfg = pickNetwork()
const { setNetworkId, getNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id')
const { toHex } = await import('@midnight-ntwrk/midnight-js-utils')
const {
  HDWallet,
  Roles,
  generateRandomSeed,
  createKeystore,
} = await import('@midnight-ntwrk/wallet-sdk')
const { Buffer } = await import('buffer')

setNetworkId(cfg.networkId)
await mkdir(WALLET_DIR, { recursive: true })

const seedPath = new URL(`seed-${cfg.networkId}.txt`, WALLET_DIR)
const outPath = new URL(`wallet-${cfg.networkId}.json`, WALLET_DIR)

let seed = process.env.WALLET_SEED
if (!seed) {
  try {
    seed = (await readFile(seedPath, 'utf8')).trim()
    console.log(`[wallet] Reusing seed from ${seedPath.pathname}`)
  } catch {
    seed = toHex(Buffer.from(generateRandomSeed()))
    await writeFile(seedPath, seed + '\n', { mode: 0o600 })
    console.log(`[wallet] NEW seed saved to ${seedPath.pathname} — keep private`)
  }
}

const hd = HDWallet.fromSeed(Buffer.from(seed, 'hex'))
if (hd.type !== 'seedOk') throw new Error('Invalid seed')
const derived = hd.hdWallet
  .selectAccount(0)
  .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
  .deriveKeysAt(0)
if (derived.type !== 'keysDerived') throw new Error('Key derivation failed')
hd.hdWallet.clear()

const keystore = createKeystore(derived.keys[Roles.NightExternal], getNetworkId())
const address = String(keystore.getBech32Address())
if (!address.startsWith(`mn_addr_${cfg.networkId}`)) {
  console.warn(`[wallet] Unexpected prefix: ${address}`)
}

const payload = {
  networkId: cfg.networkId,
  unshieldedAddress: address,
  faucetUi: cfg.faucetUi,
  faucetApi: cfg.faucetApi,
  createdAt: new Date().toISOString(),
  seedFile: seedPath.pathname,
}
await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', { mode: 0o600 })

console.log('')
console.log('=== Carrot Midnight funding wallet ===')
console.log(`Network:  ${cfg.networkId}`)
console.log(`Address:  ${address}`)
console.log(`Faucet UI:${cfg.faucetUi}`)
console.log(`Saved:    ${outPath.pathname}`)
console.log('')
console.log('PARENT / JUDGE — browser faucet steps:')
console.log(`  1. Open ${cfg.faucetUi}`)
console.log(`  2. Paste address: ${address}`)
console.log('  3. Complete captcha → Request tokens')
console.log('  4. Wait ~1–2 min, then: npm run preview:faucet')
console.log('')
