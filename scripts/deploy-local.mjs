#!/usr/bin/env node
/**
 * Primary WaveHack path: deploy carrot-game on local Undeployed stack.
 *
 * Prerequisites (Mac / host with Docker Desktop):
 *   npm run env:up          # or: midnight-local-dev `npm start`
 *   curl http://127.0.0.1:6300/health
 *   curl http://127.0.0.1:9944/health
 *
 * Uses genesis seed (pre-funded on undeployed) — NO faucet.
 *
 *   npm run deploy:local
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { WebSocket } from 'ws'
import { LOCAL, GENESIS_SEED, probeLocalStack } from './local-env.mjs'

globalThis.WebSocket = WebSocket

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const ARTIFACTS = path.join(root, 'submission/artifacts')

/** Coerce keys to primitive hex (String objects / {tag:schnorr,value}). */
function keyToHex(key, kind) {
  if (key == null) throw new Error(`missing ${kind}`)
  if (typeof key === 'string' || key instanceof String) return String(key)
  if (typeof key === 'object') {
    if (typeof key.value === 'string') return String(key.value)
    if (key instanceof Uint8Array) return Buffer.from(key).toString('hex')
    if (typeof key.toString === 'function') {
      const s = key.toString()
      if (s && s !== '[object Object]') return s
    }
  }
  throw new Error(`Cannot coerce ${kind} to hex: ${JSON.stringify(key)}`)
}

function wrapWalletKeys(wp) {
  const origCoin = wp.getCoinPublicKey.bind(wp)
  const origEnc = wp.getEncryptionPublicKey.bind(wp)
  return new Proxy(wp, {
    get(target, prop, receiver) {
      if (prop === 'getCoinPublicKey') return () => keyToHex(origCoin(), 'coinPublicKey')
      if (prop === 'getEncryptionPublicKey') return () => keyToHex(origEnc(), 'encryptionPublicKey')
      const v = Reflect.get(target, prop, receiver)
      return typeof v === 'function' ? v.bind(target) : v
    },
  })
}


async function writeArtifact(data) {
  await mkdir(ARTIFACTS, { recursive: true })
  const p = path.join(ARTIFACTS, 'deploy-local.json')
  await writeFile(p, JSON.stringify({ ...data, at: new Date().toISOString() }, null, 2) + '\n')
  console.log(`[deploy:local] Wrote ${p}`)
}

async function main() {
  console.log('[deploy:local] Probing Undeployed stack (compose.yml)…')
  const health = await probeLocalStack()
  console.log(JSON.stringify(health, null, 2))
  if (!health.ready) {
    await writeArtifact({
      ok: false,
      stage: 'stack',
      error: 'Local stack not ready. On Mac: Docker Desktop → npm run env:up (see docs/LIVE_STACK.md).',
      health,
      macCommands: [
        'docker compose version',
        'cd /path/to/carrot-midnight && npm run env:up',
        'curl -s http://127.0.0.1:6300/health',
        'curl -s http://127.0.0.1:9944/health',
        'npm run deploy:local',
      ],
    })
    console.error('[deploy:local] Stack down — primary path needs Docker compose.')
    console.error('  Mac: start Docker Desktop, then: npm run env:up && npm run deploy:local')
    console.error('  Alt: https://github.com/midnightntwrk/midnight-local-dev → npm start')
    process.exit(1)
  }

  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id')
  setNetworkId('undeployed')

  const testkit = await import('@midnight-ntwrk/testkit-js')
  const logger = testkit.createDefaultTestLogger('carrot-deploy-local')

  const envConfig = {
    walletNetworkId: 'undeployed',
    networkId: 'undeployed',
    indexer: LOCAL.indexer,
    indexerWS: LOCAL.indexerWS,
    node: LOCAL.node,
    nodeWS: LOCAL.nodeWS,
    faucet: LOCAL.faucet,
    proofServer: LOCAL.proofServer,
  }

  console.log('[deploy:local] Building genesis wallet (seed …0001)…')
  let walletProvider
  try {
    walletProvider = await testkit.MidnightWalletProvider.build(logger, envConfig, GENESIS_SEED)
    await walletProvider.start()
    // start() already waits for funds; optional re-sync uses (wallet, throttle, timeout)
    if (testkit.syncWallet && walletProvider.wallet) {
      console.log('[deploy:local] syncWallet…')
      try {
        await testkit.syncWallet(walletProvider.wallet, 2_000, 120_000)
      } catch (syncErr) {
        console.warn('[deploy:local] syncWallet skipped:', syncErr.message)
      }
    }
  } catch (e) {
    console.error('[deploy:local] Wallet failed:', e.message)
    await writeArtifact({ ok: false, stage: 'wallet', error: e.message, health })
    process.exit(1)
  }

  walletProvider = wrapWalletKeys(walletProvider)
  console.log(`[deploy:local] Keys wrapped coin=${walletProvider.getCoinPublicKey().slice(0, 16)}…`)

  const { getCompiledCarrotContract } = await import(
    pathToFileURL(path.join(root, 'src/midnight/compiledContract.ts')).href
  )
  const { createInitialPrivateState } = await import(
    pathToFileURL(path.join(root, 'src/midnight/witnesses.ts')).href
  )
  const compiledContract = await getCompiledCarrotContract()

  const { NodeZkConfigProvider } = await import(
    '@midnight-ntwrk/midnight-js-node-zk-config-provider'
  )
  const { httpClientProofProvider } = await import(
    '@midnight-ntwrk/midnight-js-http-client-proof-provider'
  )
  const { indexerPublicDataProvider } = await import(
    '@midnight-ntwrk/midnight-js-indexer-public-data-provider'
  )
  const { deployContract, submitCallTx } = await import('@midnight-ntwrk/midnight-js-contracts')

  const zkConfigProvider = new NodeZkConfigProvider(path.join(root, 'contracts/managed/carrot-game'))
  const proofProvider = httpClientProofProvider(new URL(LOCAL.proofServer), zkConfigProvider)
  const publicDataProvider = indexerPublicDataProvider(LOCAL.indexer, LOCAL.indexerWS)
  const privateStateProvider = testkit.inMemoryPrivateStateProvider()

  let providers
  try {
    providers = testkit.initializeMidnightProviders({
      walletProvider,
      midnightProvider: walletProvider,
      privateStateProvider,
      publicDataProvider,
      proofProvider,
      zkConfigProvider,
    })
  } catch {
    providers = {
      privateStateProvider,
      zkConfigProvider,
      proofProvider,
      publicDataProvider,
      walletProvider,
      midnightProvider: walletProvider,
    }
  }

  console.log('[deploy:local] deployContract(carrot-game)…')
  let contractAddress
  let deployTxId
  try {
    const { sampleSigningKey } = await import('@midnight-ntwrk/midnight-js-protocol/compact-runtime')
    const signingKey = sampleSigningKey()
    const deployed = await deployContract(providers, {
      compiledContract,
      privateStateId: 'carrot-midnight:private:v1',
      initialPrivateState: createInitialPrivateState(),
      args: [],
      signingKey,
    })
    contractAddress = deployed.deployTxData.public.contractAddress
    deployTxId = deployed.deployTxData.public.txId ?? deployed.deployTxData.public.txHash ?? null
    console.log(`[deploy:local] Contract ${contractAddress}`)
  } catch (e) {
    console.error('[deploy:local] Deploy failed:', e.message)
    await writeArtifact({ ok: false, stage: 'deploy', error: e.message, health })
    if (walletProvider.stop) await walletProvider.stop().catch(() => undefined)
    process.exit(1)
  }

  let smokeTxId = null
  let smokeError = null
  try {
    console.log('[deploy:local] Smoke cancelOpenGame…')
    const result = await submitCallTx(providers, {
      compiledContract,
      contractAddress,
      privateStateId: 'carrot-midnight:private:v1',
      circuitId: 'cancelOpenGame',
      args: [],
    })
    smokeTxId = result.public?.txId ?? result.public?.txHash ?? 'ok'
    console.log(`[deploy:local] Smoke ${smokeTxId}`)
  } catch (e) {
    smokeError = e.message
    console.warn('[deploy:local] Smoke failed:', e.message)
  }

  await writeArtifact({
    ok: true,
    stage: 'done',
    networkId: 'undeployed',
    contractAddress,
    deployTxId,
    smokeTxId,
    smokeError,
    genesisSeedHint: '…0001 (midnight-local-dev / hello-world Alice)',
    health,
  })

  if (walletProvider.stop) await walletProvider.stop().catch(() => undefined)
  console.log('[deploy:local] Done.')
}

main().catch(async (e) => {
  console.error('[deploy:local] Fatal:', e)
  await writeArtifact({ ok: false, stage: 'fatal', error: String(e?.message ?? e) })
  process.exit(1)
})
