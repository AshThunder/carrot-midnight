/**
 * Preview / Preprod public endpoints — mirrors docs.midnight.network environment reference
 * + testkit PreviewTestEnvironment faucet drip URL.
 */
export const NETWORKS = {
  preview: {
    networkId: 'preview',
    indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preview.midnight.network',
    nodeWS: 'wss://rpc.preview.midnight.network',
    /** Prefer local Docker proof-server; fall back to 1AM ProofStation when unset / unreachable. */
    proofServerLocal: 'http://127.0.0.1:6300',
    proofStation: 'https://api-preview.1am.xyz',
    faucetApi: 'https://faucet.preview.midnight.network/api/drips',
    faucetUi: 'https://midnight-tmnight-preview.nethermind.dev/',
    faucetHealth: 'https://faucet.preview.midnight.network/api/health',
  },
  preprod: {
    networkId: 'preprod',
    indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node: 'https://rpc.preprod.midnight.network',
    nodeWS: 'wss://rpc.preprod.midnight.network',
    proofServerLocal: 'http://127.0.0.1:6300',
    proofStation: 'https://api-preprod.1am.xyz',
    faucetApi: 'https://faucet.preprod.midnight.network/api/drips',
    faucetUi: 'https://faucet.preprod.midnight.network/',
    faucetHealth: 'https://faucet.preprod.midnight.network/api/health',
  },
}

export function pickNetwork(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith('--network='))
  const name = (flag?.split('=')[1] || process.env.MIDNIGHT_NETWORK || 'preview').toLowerCase()
  const cfg = NETWORKS[name]
  if (!cfg) throw new Error(`Unknown network ${name}. Use preview or preprod.`)
  return cfg
}

export async function resolveProofServer(cfg) {
  const preferStation = process.env.PROOF_SERVER === 'station' || process.env.PROOF_SERVER === 'proofstation'
  const candidates = preferStation
    ? [cfg.proofStation, cfg.proofServerLocal]
    : [cfg.proofServerLocal, cfg.proofStation]
  for (const url of candidates) {
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(8000) })
      if (res.ok) return { url, source: url.includes('1am.xyz') ? 'proofstation' : 'local' }
    } catch {
      /* try next */
    }
  }
  return { url: null, source: 'none' }
}

export const WALLET_DIR = new URL('../.preview-wallet/', import.meta.url)
export const ARTIFACTS_DIR = new URL('../submission/artifacts/', import.meta.url)
