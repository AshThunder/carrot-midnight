#!/usr/bin/env node
/**
 * Preview/Preprod deploy for carrot-game.
 *
 * Aligns providers with hello-world (levelPrivateStateProvider + password,
 * httpClientProofProvider(url, zkConfigProvider), NodeZkConfigProvider on
 * contracts/managed/carrot-game). Wraps wallet keys to primitive hex strings
 * (getCoinPublicKey / getEncryptionPublicKey may return String objects or
 * {tag:'schnorr',value:hex}). Long wallet sync timeout for public testnets.
 * After tNIGHT, registers NIGHT UTXOs for DUST fee generation.
 *
 * Usage:
 *   npm run preview:deploy
 *   MIDNIGHT_NETWORK=preprod npm run preprod:deploy
 *   PROOF_SERVER=station npm run preview:deploy -- --network=preview
 *
 * Prefer: tsx scripts/preview-deploy.mjs (TS imports for compiledContract/witnesses)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { WebSocket } from 'ws'
import * as Rx from 'rxjs'
import {
  pickNetwork,
  resolveProofServer,
  WALLET_DIR,
  ARTIFACTS_DIR,
} from './preview-env.mjs'

globalThis.WebSocket = WebSocket

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const cfg = pickNetwork()

/** Preprod/preview sync can take a long time against public indexers. */
const SYNC_TIMEOUT_MS = Number(process.env.WALLET_SYNC_TIMEOUT_MS || 45 * 60 * 1000)
const SYNC_THROTTLE_MS = Number(process.env.WALLET_SYNC_THROTTLE_MS || 5_000)

/**
 * Lean wallet sync — avoids testkit.syncWallet's per-emission logging which OOMs
 * on preprod (thousands of FacadeState objects). Throttle + sparse progress logs.
 */
function progressFlags(state) {
  return {
    shielded: !!state.shielded?.state?.progress?.isStrictlyComplete?.(),
    unshielded: !!state.unshielded?.progress?.isStrictlyComplete?.(),
    dust: !!state.dust?.state?.progress?.isStrictlyComplete?.(),
  }
}

function isFullySynced(state) {
  const p = progressFlags(state)
  return p.shielded && p.unshielded && p.dust
}

/**
 * Poll wallet.state() with short-lived subscriptions to avoid OOM from a
 * continuous preprod sync stream (FacadeState flood → heap exhaustion).
 */
async function pollWalletState(wallet) {
  return Rx.firstValueFrom(wallet.state().pipe(Rx.take(1)))
}

async function leanSyncWallet(
  wallet,
  {
    intervalMs = 8_000,
    timeoutMs = SYNC_TIMEOUT_MS,
    label = 'sync',
    predicate = isFullySynced,
  } = {},
) {
  console.log(
    `[deploy] leanSyncWallet ${label} (pollEvery=${intervalMs}ms, wallTimeout=${timeoutMs}ms)…`,
  )
  const started = Date.now()
  let polls = 0
  while (Date.now() - started < timeoutMs) {
    polls++
    let state
    try {
      state = await pollWalletState(wallet)
    } catch (e) {
      console.warn(`[deploy] ${label} poll error:`, e.message)
      await new Promise((r) => setTimeout(r, intervalMs))
      continue
    }
    const flags = progressFlags(state)
    const elapsed = Math.round((Date.now() - started) / 1000)
    console.log(
      `[deploy] ${label} [#${polls}] +${elapsed}s: shielded=${flags.shielded} unshielded=${flags.unshielded} dust=${flags.dust}`,
    )
    if (predicate(state)) {
      console.log(`[deploy] ${label} complete after ${polls} polls / ${elapsed}s`)
      return state
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(
    `Wallet sync timeout after ${timeoutMs}ms (${polls} polls, label=${label})`,
  )
}


/** Dev password satisfying midnight-js-utils policy (hello-world skill). */
const PRIVATE_STORAGE_PASSWORD = 'xK9#mQ2$pL8@nR5!vW3*'

async function writeArtifact(data) {
  await mkdir(ARTIFACTS_DIR, { recursive: true })
  const p = new URL(`deploy-${cfg.networkId}.json`, ARTIFACTS_DIR)
  await writeFile(p, JSON.stringify({ ...data, at: new Date().toISOString() }, null, 2) + '\n')
  console.log(`[deploy] Artifact ${p.pathname}`)
}

async function readWalletMeta() {
  try {
    return JSON.parse(await readFile(new URL(`wallet-${cfg.networkId}.json`, WALLET_DIR), 'utf8'))
  } catch {
    return null
  }
}

/**
 * Coerce wallet public keys to primitive hex strings for deployContract.
 * Handles: plain hex, boxed String, {tag:'schnorr',value:hex}, bech32 via utils.
 */
function keyToHex(key, kind, networkId, parseFn) {
  if (key == null) throw new Error(`missing ${kind}`)
  // Boxed String / primitive string
  if (typeof key === 'string' || key instanceof String) {
    const s = String(key)
    if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) return s
    try {
      return parseFn(s, networkId)
    } catch {
      return s
    }
  }
  if (typeof key === 'object') {
    if (typeof key.value === 'string') return keyToHex(key.value, kind, networkId, parseFn)
    if (key instanceof Uint8Array) {
      return Buffer.from(key).toString('hex')
    }
    if (typeof key.toString === 'function') {
      const s = key.toString()
      if (s && s !== '[object Object]') return keyToHex(s, kind, networkId, parseFn)
    }
  }
  throw new Error(`Cannot coerce ${kind} to hex: ${JSON.stringify(key)}`)
}


/** sampleSigningKey() may return {tag:'schnorr',value:hex} — deployContract expects hex string. */
function toSigningKeyHex(sk) {
  if (sk == null) throw new Error('missing signingKey')
  if (typeof sk === 'string' || sk instanceof String) return String(sk)
  if (typeof sk === 'object' && typeof sk.value === 'string') return sk.value
  throw new Error(`Cannot coerce signingKey to hex: ${JSON.stringify(sk)}`)
}

function wrapWalletProviderKeys(walletProvider, networkId, parseCoin, parseEnc) {
  const origCoin = walletProvider.getCoinPublicKey.bind(walletProvider)
  const origEnc = walletProvider.getEncryptionPublicKey.bind(walletProvider)
  return {
    ...walletProvider,
    wallet: walletProvider.wallet,
    unshieldedKeystore: walletProvider.unshieldedKeystore,
    zswapSecretKeys: walletProvider.zswapSecretKeys,
    dustSecretKey: walletProvider.dustSecretKey,
    getCoinPublicKey: () => keyToHex(origCoin(), 'coinPublicKey', networkId, parseCoin),
    getEncryptionPublicKey: () => keyToHex(origEnc(), 'encryptionPublicKey', networkId, parseEnc),
    balanceTx: (...args) => walletProvider.balanceTx(...args),
    submitTx: (...args) => walletProvider.submitTx(...args),
    start: (...args) => walletProvider.start(...args),
    stop: (...args) => walletProvider.stop(...args),
  }
}

async function registerDustIfNeeded(wallet, unshieldedKeystore, unshieldedToken, logger) {
  const state = await Rx.firstValueFrom(wallet.state())
  const dustBal = typeof state.dust?.balance === 'function' ? state.dust.balance(new Date()) : 0n
  const dustValue = typeof dustBal === 'bigint' ? dustBal : 0n
  if (dustValue > 0n) {
    logger.info(`[deploy] DUST balance already ${dustValue}`)
    return { registered: false, dustBalance: String(dustValue) }
  }

  const nightRaw = unshieldedToken().raw
  const available = state.unshielded?.availableCoins ?? []
  const unregistered = available.filter(
    (coin) => coin.utxo?.type === nightRaw && coin.meta?.registeredForDustGeneration === false,
  )
  if (unregistered.length === 0) {
    logger.warn('[deploy] No unregistered NIGHT UTXOs for DUST — faucet may not have landed yet')
    return { registered: false, dustBalance: '0', note: 'no-unregistered-night' }
  }

  logger.info(`[deploy] Registering ${unregistered.length} NIGHT UTXO(s) for DUST…`)
  const recipe = await wallet.registerNightUtxosForDustGeneration(
    unregistered,
    unshieldedKeystore.getPublicKey(),
    (payload) => unshieldedKeystore.signData(payload),
  )
  const finalized = await wallet.finalizeRecipe(recipe)
  const txId = await wallet.submitTransaction(finalized)
  logger.info(`[deploy] DUST registration tx: ${txId}`)
  return { registered: true, dustRegistrationTxId: txId, dustBalance: 'pending' }
}

function nightBalanceFromState(state, nightRaw) {
  return state.unshielded?.balances?.[nightRaw] ?? 0n
}

async function main() {
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id')
  setNetworkId(cfg.networkId)

  const { parseCoinPublicKeyToHex, parseEncPublicKeyToHex } = await import(
    '@midnight-ntwrk/midnight-js-utils'
  )
  const { unshieldedToken } = await import('@midnight-ntwrk/midnight-js-protocol/ledger')

  const proof = await resolveProofServer(cfg)
  const walletMeta = await readWalletMeta()
  console.log(`[deploy] Network ${cfg.networkId}`)
  console.log(`[deploy] Wallet ${walletMeta?.unshieldedAddress ?? '(run preview:wallet / preprod:wallet)'}`)
  console.log(`[deploy] Proof ${proof.url ?? 'NONE'} (${proof.source})`)
  console.log(`[deploy] Sync timeout ${SYNC_TIMEOUT_MS}ms`)

  if (!walletMeta) {
    await writeArtifact({ ok: false, stage: 'wallet', error: 'missing wallet meta — run preprod:wallet' })
    process.exit(1)
  }
  if (!proof.url) {
    await writeArtifact({
      ok: false,
      stage: 'proof-server',
      error: 'No proof server. Docker proof-server :6300 or ProofStation unreachable.',
      address: walletMeta.unshieldedAddress,
    })
    process.exit(1)
  }

  let seed
  try {
    seed = (await readFile(new URL(`seed-${cfg.networkId}.txt`, WALLET_DIR), 'utf8')).trim()
  } catch {
    await writeArtifact({ ok: false, stage: 'seed', error: 'missing seed file' })
    process.exit(1)
  }

  const testkit = await import('@midnight-ntwrk/testkit-js')
  const logger = testkit.createDefaultTestLogger('carrot-preview-deploy')

  const envConfig = {
    walletNetworkId: cfg.networkId,
    networkId: cfg.networkId,
    indexer: cfg.indexer,
    indexerWS: cfg.indexerWS,
    node: cfg.node,
    nodeWS: cfg.nodeWS,
    faucet: cfg.faucetApi,
    proofServer: proof.url,
  }

  console.log('[deploy] Building wallet provider (start without waitForFunds)…')
  let rawWallet
  try {
    // Prefer MidnightWalletProvider.build; it declares supportedEras ['v8','v9']
    rawWallet = await testkit.MidnightWalletProvider.build(logger, envConfig, seed)
    // false: skip short default sync + faucet (captcha-blocked on preprod)
    await rawWallet.start(false)
    console.log(`[deploy] wallet supportedEras=${JSON.stringify(rawWallet.supportedEras)}`)
  } catch (e) {
    console.error('[deploy] Wallet failed:', e.message)
    await writeArtifact({
      ok: false,
      stage: 'wallet-start',
      error: e.message,
      address: walletMeta.unshieldedAddress,
      proof,
    })
    process.exit(1)
  }

  let synced
  try {
    // mj5 + preprod indexer: UnshieldedTransactionsProgress.protocolVersion may 400.
    // Treat positive tNIGHT balance as sync-ready (do not require isStrictlyComplete).
    synced = await leanSyncWallet(rawWallet.wallet, {
      intervalMs: 8_000,
      timeoutMs: Number(process.env.BALANCE_SYNC_MS || 600_000),
      label: "balance-sync",
      predicate: (s) => {
        try {
          if (isFullySynced(s)) return true
          const bals = s.unshielded?.balances || {}
          const bal = Object.values(bals).reduce(
            (a, b) => (typeof b === "bigint" && b > a ? b : a),
            0n,
          )
          const flags = progressFlags(s)
          // After indexer patch, unshielded progress should complete; balance is fallback.
          if (flags.unshielded || bal > 0n) return true
        } catch {}
        return false
      },
    })
  } catch (e) {
    console.warn("[deploy] Balance sync incomplete:", e.message, "— polling once")
    synced = await pollWalletState(rawWallet.wallet)
  }

  const nightRaw = unshieldedToken().raw
  const nightBal = nightBalanceFromState(synced, nightRaw)
  console.log(`[deploy] tNIGHT balance: ${nightBal}`)

  if (nightBal <= 0n) {
    const msg =
      'No tNIGHT in wallet after sync. Fund via faucet UI (captcha), then re-run preprod:faucet / preprod:deploy.'
    console.error(`[deploy] ${msg}`)
    await writeArtifact({
      ok: false,
      stage: 'faucet-funding',
      error: msg,
      address: walletMeta.unshieldedAddress,
      faucetUi: cfg.faucetUi,
      faucetApi: cfg.faucetApi,
      proof,
      nightBalance: '0',
      blocker: 'faucet',
    })
    if (rawWallet.stop) await rawWallet.stop().catch(() => undefined)
    process.exit(2)
  }

  let dustInfo = { registered: false }
  try {
    dustInfo = await registerDustIfNeeded(
      rawWallet.wallet,
      rawWallet.unshieldedKeystore,
      unshieldedToken,
      { info: (m) => console.log(m), warn: (m) => console.warn(m) },
    )
  } catch (e) {
    console.warn('[deploy] DUST registration warning:', e.message)
    dustInfo = { ...dustInfo, error: e.message }
  }

  // Dust ledger sync on preprod walks many events from genesis; do not deploy until
  // we observe a positive DUST balance (fees). Poll leanly to avoid OOM.
  const dustSyncMs = Number(process.env.DUST_SYNC_TIMEOUT_MS || process.env.DUST_WAIT_MS || 45 * 60 * 1000)
  console.log(`[deploy] Waiting for DUST balance > 0 (timeout=${dustSyncMs}ms, priorReg=${dustInfo.registered})…`)
  try {
    synced = await leanSyncWallet(rawWallet.wallet, {
      intervalMs: Number(process.env.DUST_POLL_MS || 15_000),
      timeoutMs: dustSyncMs,
      label: 'dust-balance',
      predicate: (s) => {
        try {
          const dustBal = typeof s.dust?.balance === 'function' ? s.dust.balance(new Date()) : 0n
          const p = s.dust?.state?.progress
          if (Number(process.env.DUST_DEBUG || 0)) {
            console.log(
              `[deploy] dust debug bal=${dustBal} connected=${p?.isConnected} applied=${p?.appliedIndex} highest=${p?.highestIndex}`,
            )
          }
          return typeof dustBal === 'bigint' && dustBal > 0n
        } catch {
          return false
        }
      },
    })
    const dustBal =
      typeof synced.dust?.balance === 'function' ? synced.dust.balance(new Date()) : 0n
    console.log(`[deploy] DUST balance now: ${dustBal}`)
    dustInfo.dustBalance = String(dustBal)
  } catch (e) {
    console.error('[deploy] DUST sync/balance wait failed:', e.message)
    synced = await pollWalletState(rawWallet.wallet).catch(() => synced)
    const dustBal =
      typeof synced?.dust?.balance === 'function' ? synced.dust.balance(new Date()) : 0n
    dustInfo.dustBalance = String(dustBal)
    await writeArtifact({
      ok: false,
      stage: 'dust-funding',
      error: e.message,
      address: walletMeta.unshieldedAddress,
      proof,
      nightBalance: String(nightBal),
      dust: dustInfo,
      blocker: 'dust',
      note: 'NIGHT is registered for dust; wait for dust ledger sync to catch up, then re-run deploy.',
    })
    if (rawWallet.stop) await rawWallet.stop().catch(() => undefined)
    process.exit(3)
  }

  // Raw MidnightWalletProvider keeps supportedEras ['v8','v9'] required by midnight-js 5 seams.
  // Keys from ledger WASM are already hex strings; wrap only if tagged objects appear.
  const coinRaw = rawWallet.getCoinPublicKey()
  const encRaw = rawWallet.getEncryptionPublicKey()
  const coinHex = keyToHex(coinRaw, 'coinPublicKey', cfg.networkId, parseCoinPublicKeyToHex)
  const encHex = keyToHex(encRaw, 'encryptionPublicKey', cfg.networkId, parseEncPublicKeyToHex)
  console.log(`[deploy] coinPublicKey hex len=${coinHex.length} encPublicKey hex len=${encHex.length}`)
  if (String(coinRaw) !== coinHex || String(encRaw) !== encHex) {
    console.warn('[deploy] Key coercion applied (raw !== hex)')
  }

  const zkConfigPath = path.join(root, 'contracts/managed/carrot-game')

  const { getCompiledCarrotContract } = await import(
    pathToFileURL(path.join(root, 'src/midnight/compiledContract.ts')).href
  )
  const { createInitialPrivateState } = await import(
    pathToFileURL(path.join(root, 'src/midnight/witnesses.ts')).href
  )
  const compiledContract = await getCompiledCarrotContract(zkConfigPath)

  const { NodeZkConfigProvider } = await import(
    '@midnight-ntwrk/midnight-js-node-zk-config-provider'
  )
  const { httpClientProofProvider } = await import(
    '@midnight-ntwrk/midnight-js-http-client-proof-provider'
  )
  const { indexerPublicDataProvider } = await import(
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
  )
  const { levelPrivateStateProvider } = await import(
    '@midnight-ntwrk/midnight-js-level-private-state-provider'
  )
  const { deployContract, submitCallTx } = await import('@midnight-ntwrk/midnight-js-contracts')

  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath)
  const proofProvider = httpClientProofProvider(proof.url, zkConfigProvider)
  console.log(`[deploy] proof supportedEras=${JSON.stringify(proofProvider.supportedEras)}`)
  const publicDataProvider = indexerPublicDataProvider(cfg.indexer, cfg.indexerWS)
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: `carrot-game-${cfg.networkId}-${Date.now()}`,
    privateStoragePasswordProvider: () => PRIVATE_STORAGE_PASSWORD,
    accountId: `carrot-${cfg.networkId}-${coinHex.slice(0, 16)}`,
  })

  const providers = {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider: rawWallet,
    midnightProvider: rawWallet,
  }

  console.log('[deploy] deployContract…')
  let contractAddress
  let deployTxId
  try {
    // mj 4.1.x Configuration expects hex signingKey string.
    const { sampleSigningKey } = await import('@midnight-ntwrk/midnight-js-protocol/compact-runtime')
    const sampled = sampleSigningKey()
    const signingKey = typeof sampled === 'string' ? sampled : sampled.value
    console.log(`[deploy] signingKey hex len=${String(signingKey).length}`)
    const deployed = await deployContract(providers, {
      compiledContract,
      privateStateId: 'carrot-midnight:private:v1',
      initialPrivateState: createInitialPrivateState(),
      args: [],
      signingKey,
    })
    contractAddress = deployed.deployTxData.public.contractAddress
    deployTxId = deployed.deployTxData.public.txId ?? deployed.deployTxData.public.txHash ?? null
    console.log(`[deploy] Contract ${contractAddress}`)
  } catch (e) {
    const causeMsg = e?.cause?.message || e?.cause || null
    console.error('[deploy] Deploy failed:', e.message)
    if (causeMsg) console.error('[deploy] Cause:', causeMsg)
    if (e?.stack) console.error(e.stack.split('\n').slice(0, 12).join('\n'))
    await writeArtifact({
      ok: false,
      stage: 'deploy',
      error: e.message,
      cause: causeMsg ? String(causeMsg) : undefined,
      address: walletMeta.unshieldedAddress,
      proof,
      nightBalance: String(nightBal),
      dust: dustInfo,
    })
    if (rawWallet.stop) await rawWallet.stop().catch(() => undefined)
    process.exit(1)
  }

  let smokeTxId = null
  let smokeError = null
  try {
    console.log('[deploy] Smoke cancelOpenGame…')
    const result = await submitCallTx(providers, {
      compiledContract,
      contractAddress,
      privateStateId: 'carrot-midnight:private:v1',
      circuitId: 'cancelOpenGame',
      args: [],
    })
    smokeTxId = result.public?.txId ?? result.public?.txHash ?? 'ok'
    console.log(`[deploy] Smoke ${smokeTxId}`)
  } catch (e) {
    smokeError = e.message
    console.warn('[deploy] Smoke failed:', e.message)
  }

  await writeArtifact({
    ok: true,
    stage: 'done',
    networkId: cfg.networkId,
    contractAddress,
    deployTxId,
    smokeTxId,
    smokeError,
    address: walletMeta.unshieldedAddress,
    proof,
    nightBalance: String(nightBal),
    dust: dustInfo,
  })

  if (rawWallet.stop) await rawWallet.stop().catch(() => undefined)
  console.log('[deploy] Done.')
}

main().catch(async (e) => {
  console.error('[deploy] Fatal:', e)
  await writeArtifact({ ok: false, stage: 'fatal', error: String(e?.message ?? e) })
  process.exit(1)
})
