/** Known deployed contract addresses for judge / live demos (no secrets). */

export type NetworkKey = 'local' | 'preview' | 'preprod'

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env

/** Preprod Wave 1 deploy — see submission/artifacts/deploy-preprod.json */
export const PREPROD_CONTRACT_ADDRESS =
  env?.VITE_CONTRACT_ADDRESS_PREPROD?.trim() ||
  '0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15'

export const PREPROD_DEPLOY_TX_ID =
  env?.VITE_CONTRACT_TX_PREPROD?.trim() ||
  '0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a'

/** Public JSON path (copied into Vite `public/`). */
export const PREPROD_DEPLOY_ARTIFACT_URL = '/deploy-preprod.json'

export function knownContractForNetwork(networkKey: NetworkKey): string | undefined {
  if (networkKey === 'preprod') return PREPROD_CONTRACT_ADDRESS
  const envKey =
    networkKey === 'preview'
      ? env?.VITE_CONTRACT_ADDRESS_PREVIEW?.trim()
      : env?.VITE_CONTRACT_ADDRESS_LOCAL?.trim()
  return envKey || undefined
}

export function parseNetworkKey(raw: string | undefined | null, fallback: NetworkKey = 'local'): NetworkKey {
  if (raw === 'local' || raw === 'preview' || raw === 'preprod') return raw
  return fallback
}

/** Default UI network: honor VITE_MIDNIGHT_NETWORK (prefer preprod when set). */
export function defaultNetworkKey(): NetworkKey {
  return parseNetworkKey(env?.VITE_MIDNIGHT_NETWORK, 'local')
}
