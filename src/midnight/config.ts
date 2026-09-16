import type { NetworkId } from './types'

/** Network endpoints for Midnight stacks (docs.midnight.network environment reference). */
export type NetworkConfig = {
  networkId: NetworkId
  label: string
  indexer: string
  indexerWS: string
  node: string
  nodeWS: string
  proofServer: string
  faucet: string
  /** Browser faucet UI (captcha). API drip is `${faucet}/api/drips` when hosted on faucet.*. */
  faucetUi?: string
}

export const LOCAL_CONFIG: NetworkConfig = {
  networkId: 'undeployed',
  label: 'Local compose stack',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: '',
}

/**
 * Preview public endpoints.
 * Proof server: prefer local :6300; headless scripts may use 1AM ProofStation
 * (https://api-preview.1am.xyz) when Docker is unavailable.
 */
export const PREVIEW_CONFIG: NetworkConfig = {
  networkId: 'preview',
  label: 'Midnight preview',
  indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  nodeWS: 'wss://rpc.preview.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
  faucet: 'https://faucet.preview.midnight.network/api/drips',
  faucetUi: 'https://faucet.preview.midnight.network/',
}

export const PREPROD_CONFIG: NetworkConfig = {
  networkId: 'preprod',
  label: 'Midnight preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
  faucet: 'https://faucet.preprod.midnight.network/api/drips',
  faucetUi: 'https://faucet.preprod.midnight.network/',
}

export const NETWORKS: Record<'local' | 'preview' | 'preprod', NetworkConfig> = {
  local: LOCAL_CONFIG,
  preview: PREVIEW_CONFIG,
  preprod: PREPROD_CONFIG,
}

/** Optional ProofStation URL for Docker-free Preview proving (1AM). */
export const PREVIEW_PROOFSTATION = 'https://api-preview.1am.xyz'

export function getConfig(override?: string): NetworkConfig {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  const network = (override ?? env?.VITE_MIDNIGHT_NETWORK ?? 'preprod') as keyof typeof NETWORKS
  const cfg = NETWORKS[network]
  if (!cfg) {
    throw new Error(`Unknown network: ${network}. Use local, preview, or preprod.`)
  }
  return cfg
}

/** Network id for setNetworkId() — called inside tryBuildLiveProviders / buildLiveProviders. */
export function networkIdForSdk(cfg: NetworkConfig = getConfig()): NetworkId {
  return cfg.networkId
}
