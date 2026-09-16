/**
 * Real Midnight.js provider construction (4.1.1) with graceful stub fallback.
 *
 * Live path when stack health is green:
 *   setNetworkId → FetchZkConfigProvider | NodeZkConfigProvider
 *   → indexerPublicDataProvider → httpClientProofProvider (or wallet proving)
 *   → levelPrivateStateProvider → wallet/midnight adapters
 */
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import { getConfig, type NetworkConfig } from './config'
import { probeStackHealth, type StackHealth } from './stackHealth'
import {
  CARROT_PRIVATE_STATE_ID,
  type CarrotCircuitId,
  type CarrotPrivateState,
  type CarrotProviders,
  type DeployedCarrotHandle,
  type PrivateStateProviderLike,
  type WalletProviderLike,
} from './types'
import { ZK_BROWSER_ASSET_BASE } from './compiledContract'

export const PROVIDERS_STUB_NOTE =
  'Providers not fully live — need Midnight JS packages + reachable proof-server/indexer/node (Docker compose).'

export const MIDNIGHT_JS_PACKAGES = [
  '@midnight-ntwrk/midnight-js-contracts',
  '@midnight-ntwrk/midnight-js-types',
  '@midnight-ntwrk/midnight-js-indexer-public-data-provider',
  '@midnight-ntwrk/midnight-js-http-client-proof-provider',
  '@midnight-ntwrk/midnight-js-level-private-state-provider',
  '@midnight-ntwrk/midnight-js-fetch-zk-config-provider',
  '@midnight-ntwrk/midnight-js-network-id',
  '@midnight-ntwrk/midnight-js-node-zk-config-provider',
  '@midnight-ntwrk/midnight-js-protocol',
  '@midnight-ntwrk/midnight-js-utils',
] as const

/** Default LevelDB password (dev only) — satisfies midnight-js-utils policy. */
export const DEV_PRIVATE_STORAGE_PASSWORD = 'xK9#mQ2$pL8@nR5!vW3*'

const memoryPrivateState = new Map<string, CarrotPrivateState>()

function stubPrivateStateProvider(): PrivateStateProviderLike {
  return {
    async get(key) {
      return memoryPrivateState.get(key) ?? null
    },
    async set(key, state) {
      memoryPrivateState.set(key, state)
    },
    async clear(key) {
      memoryPrivateState.delete(key)
    },
  }
}

function notReady(op: string, extra?: string): never {
  const suffix = extra ? ` — ${extra}` : ''
  throw new Error(`${PROVIDERS_STUB_NOTE} (attempted: ${op})${suffix}`)
}

export type ProviderBuildMode = 'stub' | 'live-ready' | 'partial'

export type ProviderConstructionPlan = {
  mode: ProviderBuildMode
  config: NetworkConfig
  health: StackHealth
  packagesPresent: boolean
  blockers: string[]
  blueprint: {
    setNetworkId: string
    privateStateStoreName: string
    publicDataProvider: string
    proofProvider: string
    zkConfigProvider: string
    zkAssetBasePath: string
  }
}

/** Packages are installed in this project — always true after W0.3 npm i. */
export async function detectMidnightJsPackages(): Promise<boolean> {
  try {
    await import('@midnight-ntwrk/midnight-js-network-id')
    return true
  } catch {
    return false
  }
}

export async function planProviderConstruction(
  config: NetworkConfig = getConfig(),
): Promise<ProviderConstructionPlan> {
  const health = await probeStackHealth(config)
  const packagesPresent = await detectMidnightJsPackages()
  const blockers: string[] = [...health.disabledReasons]

  if (!packagesPresent) {
    blockers.push(
      `Install midnight-js provider packages: ${MIDNIGHT_JS_PACKAGES.slice(0, 3).join(', ')}, …`,
    )
  }

  let mode: ProviderBuildMode = 'stub'
  if (packagesPresent && health.stackReady) mode = 'live-ready'
  else if (packagesPresent || health.proofServerReady) mode = 'partial'

  return {
    mode,
    config,
    health,
    packagesPresent,
    blockers,
    blueprint: {
      setNetworkId: `setNetworkId('${config.networkId}')`,
      privateStateStoreName: 'carrot-midnight-private-state',
      publicDataProvider: `indexerPublicDataProvider('${config.indexer}', '${config.indexerWS}')`,
      proofProvider: config.proofServer
        ? `httpClientProofProvider('${config.proofServer}', zkConfigProvider)`
        : 'createProofProvider(await connectedAPI.getProvingProvider(zkConfigProvider))',
      zkConfigProvider:
        typeof window !== 'undefined'
          ? `new FetchZkConfigProvider('${ZK_BROWSER_ASSET_BASE}', fetch)`
          : `new NodeZkConfigProvider('${ZK_BROWSER_ASSET_BASE}')`,
      zkAssetBasePath: ZK_BROWSER_ASSET_BASE,
    },
  }
}

function serializeTxMaybe(tx: unknown): string {
  if (typeof tx === 'string') return tx
  if (tx && typeof tx === 'object') {
    const anyTx = tx as { serialize?: () => string; toString?: () => string }
    if (typeof anyTx.serialize === 'function') return anyTx.serialize()
    if (typeof anyTx.toString === 'function') {
      const s = anyTx.toString()
      if (s && s !== '[object Object]') return s
    }
  }
  throw new Error('Unable to serialize transaction for DApp Connector balance/submit')
}

/**
 * Bridge ConnectedAPI (string txs) ↔ midnight-js WalletProvider + MidnightProvider.
 */
export function createConnectorWalletMidnightProviders(
  api: ConnectedAPI,
  keys: { coinPublicKey: string; encryptionPublicKey: string },
): { walletProvider: WalletProviderLike; midnightProvider: CarrotProviders['midnightProvider'] } {
  const walletProvider: WalletProviderLike = {
    getCoinPublicKey() {
      return keys.coinPublicKey
    },
    getEncryptionPublicKey() {
      return keys.encryptionPublicKey
    },
    async balanceTx(tx: unknown) {
      const serialized = serializeTxMaybe(tx)
      const balanced = await api.balanceUnsealedTransaction(serialized)
      return balanced.tx
    },
  }
  const midnightProvider = {
    async submitTx(tx: unknown) {
      const serialized = serializeTxMaybe(tx)
      await api.submitTransaction(serialized)
      return `submitted:${serialized.slice(0, 16)}`
    },
  }
  return { walletProvider, midnightProvider }
}

export type BuildProvidersOpts = {
  config?: NetworkConfig
  walletProvider?: WalletProviderLike
  midnightProvider?: CarrotProviders['midnightProvider']
  connectedApi?: ConnectedAPI | null
  accountId?: string
  privateStoragePassword?: string
  /** Force stub even if stack is up (tests). */
  forceStub?: boolean
}

/**
 * Construct live providers when endpoints + packages allow; otherwise stub bag.
 */
export async function tryBuildLiveProviders(opts: BuildProvidersOpts = {}): Promise<{
  providers: CarrotProviders
  plan: ProviderConstructionPlan
  live: boolean
}> {
  const config = opts.config ?? getConfig()
  const plan = await planProviderConstruction(config)

  if (opts.forceStub || !plan.packagesPresent || !plan.health.stackReady) {
    return {
      providers: createProvidersStub(config, opts.walletProvider, plan.blockers),
      plan,
      live: false,
    }
  }

  try {
    const providers = await buildLiveProviders({
      config,
      plan,
      walletProvider: opts.walletProvider,
      midnightProvider: opts.midnightProvider,
      connectedApi: opts.connectedApi,
      accountId: opts.accountId,
      privateStoragePassword: opts.privateStoragePassword,
    })
    return { providers, plan, live: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    plan.blockers.push(`Live provider construct failed: ${msg}`)
    return {
      providers: createProvidersStub(config, opts.walletProvider, plan.blockers),
      plan,
      live: false,
    }
  }
}

/** Build providers assuming stack is reachable (throws on factory errors). */
export async function buildLiveProviders(opts: {
  config: NetworkConfig
  plan: ProviderConstructionPlan
  walletProvider?: WalletProviderLike
  midnightProvider?: CarrotProviders['midnightProvider']
  connectedApi?: ConnectedAPI | null
  accountId?: string
  privateStoragePassword?: string
}): Promise<CarrotProviders> {
  const { config, plan } = opts

  const [{ setNetworkId }, { indexerPublicDataProvider }, { httpClientProofProvider }, { levelPrivateStateProvider }, { FetchZkConfigProvider }, { createProofProvider }] =
    await Promise.all([
      import('@midnight-ntwrk/midnight-js-network-id'),
      import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
      import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
      import('@midnight-ntwrk/midnight-js-level-private-state-provider'),
      import('@midnight-ntwrk/midnight-js-fetch-zk-config-provider'),
      import('@midnight-ntwrk/midnight-js-types'),
    ])

  setNetworkId(config.networkId as never)

  const zkBase =
    typeof window !== 'undefined'
      ? new URL(plan.blueprint.zkAssetBasePath, window.location.origin).toString()
      : plan.blueprint.zkAssetBasePath

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let zkConfigProvider: any

  if (typeof window === 'undefined') {
    try {
      const nodeZkSpec = '@midnight-ntwrk/' + 'midnight-js-node-zk-config-provider'
      const { NodeZkConfigProvider } = await import(/* @vite-ignore */ nodeZkSpec)
      zkConfigProvider = new NodeZkConfigProvider('contracts/managed/carrot-game')
    } catch {
      zkConfigProvider = new FetchZkConfigProvider(zkBase, fetch.bind(globalThis))
    }
  } else {
    zkConfigProvider = new FetchZkConfigProvider(zkBase, fetch.bind(globalThis))
  }

  let walletProvider: WalletProviderLike =
    opts.walletProvider ??
    ({
      getCoinPublicKey: () => notReady('walletProvider.getCoinPublicKey'),
      getEncryptionPublicKey: () => notReady('walletProvider.getEncryptionPublicKey'),
      balanceTx: async () => notReady('walletProvider.balanceTx'),
    } satisfies WalletProviderLike)

  let midnightProvider: CarrotProviders['midnightProvider'] =
    opts.midnightProvider ??
    ({
      async submitTx() {
        return notReady(
          'midnightProvider.submitTx',
          'Connect Lace/1AM (ConnectedAPI.submitTransaction) or use headless WalletFacade',
        )
      },
    } satisfies CarrotProviders['midnightProvider'])

  if (opts.connectedApi && opts.walletProvider) {
    const bridged = createConnectorWalletMidnightProviders(opts.connectedApi, {
      coinPublicKey: opts.walletProvider.getCoinPublicKey(),
      encryptionPublicKey: opts.walletProvider.getEncryptionPublicKey(),
    })
    walletProvider = bridged.walletProvider
    midnightProvider = bridged.midnightProvider
  }

  const accountId = opts.accountId ?? walletProvider.getCoinPublicKey() ?? 'carrot-local-account'
  const password = opts.privateStoragePassword ?? DEV_PRIVATE_STORAGE_PASSWORD

  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: plan.blueprint.privateStateStoreName,
    privateStoragePasswordProvider: async () => password,
    accountId,
  }) as unknown as PrivateStateProviderLike

  const publicDataProvider = indexerPublicDataProvider(
    config.indexer,
    config.indexerWS,
  ) as unknown as CarrotProviders['publicDataProvider']

  let proofProvider: CarrotProviders['proofProvider']
  if (config.proofServer && plan.health.proofServerReady) {
    proofProvider = httpClientProofProvider(
      config.proofServer,
      zkConfigProvider,
    ) as unknown as CarrotProviders['proofProvider']
  } else if (opts.connectedApi) {
    const proving = await opts.connectedApi.getProvingProvider(zkConfigProvider)
    proofProvider = createProofProvider(proving) as unknown as CarrotProviders['proofProvider']
  } else {
    proofProvider = {
      async prove() {
        return notReady('proofProvider.prove', 'No proof server and no wallet proving provider')
      },
    }
  }

  return {
    privateStateProvider,
    publicDataProvider,
    zkConfigProvider: {
      async get(circuitId: string) {
        return {
          proverKey: await zkConfigProvider.getProverKey(circuitId),
          verifierKey: await zkConfigProvider.getVerifierKey(circuitId),
          zkir: await zkConfigProvider.getZKIR(circuitId),
        }
      },
    },
    proofProvider,
    walletProvider,
    midnightProvider,
  }
}

export function createProvidersStub(
  config: NetworkConfig = getConfig(),
  walletProvider?: WalletProviderLike,
  blockers: string[] = [],
): CarrotProviders {
  const reason = blockers[0]
  void config
  return {
    privateStateProvider: stubPrivateStateProvider(),
    publicDataProvider: {
      async queryContractState() {
        return notReady('publicDataProvider.queryContractState', reason)
      },
    },
    zkConfigProvider: {
      async get() {
        return notReady('zkConfigProvider.get', reason)
      },
    },
    proofProvider: {
      async prove() {
        return notReady('proofProvider.prove', reason)
      },
    },
    walletProvider: walletProvider ?? {
      getCoinPublicKey() {
        return notReady('walletProvider.getCoinPublicKey', reason)
      },
      getEncryptionPublicKey() {
        return notReady('walletProvider.getEncryptionPublicKey', reason)
      },
      async balanceTx() {
        return notReady('walletProvider.balanceTx', reason)
      },
    },
    midnightProvider: {
      async submitTx() {
        return notReady('midnightProvider.submitTx', reason)
      },
    },
  }
}

export function assertProvidersReady(): never {
  throw new Error(PROVIDERS_STUB_NOTE)
}

export function createDeployedHandleStub(
  address = 'carrot-midnight-undeployed',
  blockers: string[] = [],
): DeployedCarrotHandle {
  const reason = blockers[0]
  const call =
    (id: CarrotCircuitId) =>
    async (..._args: unknown[]) =>
      notReady(`callTx.${id}`, reason)

  return {
    contractAddress: address,
    callTx: {
      createOpenGame: call('createOpenGame'),
      createDirectChallenge: call('createDirectChallenge'),
      acceptOpenGame: call('acceptOpenGame'),
      acceptDirectChallenge: call('acceptDirectChallenge'),
      cancelOpenGame: call('cancelOpenGame'),
      submitDecision: call('submitDecision'),
      postChatCiphertext: call('postChatCiphertext'),
      settle: call('settle'),
      forfeitExpired: call('forfeitExpired'),
    },
  }
}

export { CARROT_PRIVATE_STATE_ID }
export type { StackHealth }
