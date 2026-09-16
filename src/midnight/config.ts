import type { NetworkId } from './types'

/** Network endpoints for Midnight stacks. */
export type NetworkConfig = {
  networkId: NetworkId
  label: string
  indexer: string
  indexerWS: string
  node: string
  nodeWS: string
  proofServer: string
  faucet: string
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

/** Preview public endpoints (wallet proving or self-hosted proof server). */
export const PREVIEW_CONFIG: NetworkConfig = {
  networkId: 'preview',
  label: 'Midnight preview',
  indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  nodeWS: 'wss://rpc.preview.midnight.network',
  proofServer: '', // use ConnectedAPI.getProvingProvider when extension is connected
  faucet: 'https://faucet.preview.midnight.network',
}

export const NETWORKS: Record<'local' | 'preview', NetworkConfig> = {
  local: LOCAL_CONFIG,
  preview: PREVIEW_CONFIG,
}

export function getConfig(override?: string): NetworkConfig {
  const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  const network = (override ?? env?.VITE_MIDNIGHT_NETWORK ?? 'local') as keyof typeof NETWORKS
  const cfg = NETWORKS[network]
  if (!cfg) {
    throw new Error(`Unknown network: ${network}. Use local or preview.`)
  }
  return cfg
}

/** Network id for setNetworkId() — called inside tryBuildLiveProviders / buildLiveProviders. */
export function networkIdForSdk(cfg: NetworkConfig = getConfig()): NetworkId {
  return cfg.networkId
}
