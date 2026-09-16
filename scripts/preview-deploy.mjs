#!/usr/bin/env node
/**
 * Docker-free Preview/Preprod deploy attempt for carrot-game.
 *
 * Uses public node + indexer, ProofStation (or local :6300), and a seed wallet
 * from npm run preview:wallet. Writes submission/artifacts/deploy-*.json.
 *
 * Usage:
 *   npm run preview:deploy
 *   PROOF_SERVER=station npm run preview:deploy -- --network=preview
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { WebSocket } from 'ws'
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

async function main() {
  const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id')
  setNetworkId(cfg.networkId)

  const proof = await resolveProofServer(cfg)
  const walletMeta = await readWalletMeta()
  console.log(`[deploy] Network ${cfg.networkId}`)
  console.log(`[deploy] Wallet ${walletMeta?.unshieldedAddress ?? '(run preview:wallet)'}`)
  console.log(`[deploy] Proof ${proof.url ?? 'NONE'} (${proof.source})`)

  if (!walletMeta) {
    await writeArtifact({ ok: false, stage: 'wallet', error: 'missing wallet meta — run preview:wallet' })
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

  console.log('[deploy] Building wallet provider…')
  let walletProvider
  try {
    walletProvider = await testkit.MidnightWalletProvider.build(logger, envConfig, seed)
    if (walletProvider.start) await walletProvider.start()
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

  // Load compiled contract via app helper (handles managed output layout)
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
  const proofProvider = httpClientProofProvider(new URL(proof.url), zkConfigProvider)
  const publicDataProvider = indexerPublicDataProvider(cfg.indexer, cfg.indexerWS)
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

  console.log('[deploy] deployContract…')
  let contractAddress
  let deployTxId
  try {
    const deployed = await deployContract(providers, {
      compiledContract,
      privateStateId: 'carrot-midnight:private:v1',
      initialPrivateState: createInitialPrivateState(),
      args: [],
    })
    contractAddress = deployed.deployTxData.public.contractAddress
    deployTxId = deployed.deployTxData.public.txId ?? deployed.deployTxData.public.txHash ?? null
    console.log(`[deploy] Contract ${contractAddress}`)
  } catch (e) {
    console.error('[deploy] Deploy failed:', e.message)
    await writeArtifact({
      ok: false,
      stage: 'deploy',
      error: e.message,
      address: walletMeta.unshieldedAddress,
      proof,
    })
    if (walletProvider.stop) await walletProvider.stop().catch(() => undefined)
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
  })

  if (walletProvider.stop) await walletProvider.stop().catch(() => undefined)
  console.log('[deploy] Done.')
}

main().catch(async (e) => {
  console.error('[deploy] Fatal:', e)
  await writeArtifact({ ok: false, stage: 'fatal', error: String(e?.message ?? e) })
  process.exit(1)
})
