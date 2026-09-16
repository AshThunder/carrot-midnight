import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getConfig, NETWORKS, networkIdForSdk } from './config'
import {
  createProvidersStub,
  createDeployedHandleStub,
  planProviderConstruction,
  tryBuildLiveProviders,
  detectMidnightJsPackages,
  DEV_PRIVATE_STORAGE_PASSWORD,
} from './providers'
import { createWalletStub } from './walletStub'
import {
  brandFromWallet,
  buildConnectorHint,
  connectWalletApi,
  formatConnectorError,
  isLegacyV3Api,
  describeInjectionGap,
  hasCardanoLaceInjection,
  listInjectedWallets,
  selectWallet,
} from './dappConnector'
import { buildConnectionSnapshot } from './connection'
import {
  gateDeployCall,
  deployCarrotGame,
  callCarrotCircuit,
  deployCallDisabledCopy,
} from './deployService'
import { createInitialPrivateState, carrotWitnesses } from './witnesses'
import { getCompiledCarrotContract, ZK_BROWSER_ASSET_BASE } from './compiledContract'
import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import { validatePassword } from '@midnight-ntwrk/midnight-js-utils'

describe('midnight config + stubs', () => {
  it('resolves local, preview, and preprod configs', () => {
    expect(getConfig('local').networkId).toBe('undeployed')
    expect(getConfig('preview').indexer).toContain('preview.midnight.network')
    expect(getConfig('preview').faucet).toContain('/api/drips')
    expect(getConfig('preprod').networkId).toBe('preprod')
    expect(networkIdForSdk(NETWORKS.preview)).toBe('preview')
    expect(() => getConfig('mainnet' as 'local')).toThrow()
  })

  it('providers stub throws on network ops but keeps private state', async () => {
    const providers = createProvidersStub()
    await providers.privateStateProvider.set('k', {
      localSecretKey: new Uint8Array(32),
      carrotLocation: 1,
      carrotSalt: new Uint8Array(32),
    })
    await expect(providers.privateStateProvider.get('k')).resolves.toMatchObject({
      carrotLocation: 1,
    })
    await expect(providers.proofProvider.prove('settle', {})).rejects.toThrow(/Providers not/)
  })

  it('deployed handle callTx is stubbed for all circuits', async () => {
    const handle = createDeployedHandleStub()
    await expect(handle.callTx.submitDecision(true)).rejects.toThrow(/callTx.submitDecision/)
    await expect(handle.callTx.postChatCiphertext(new Uint8Array(32))).rejects.toThrow()
  })

  it('wallet session supports local demo identity', () => {
    const w = createWalletStub()
    w.enableLocalDemo('mn_test_addr')
    expect(w.status).toBe('local-demo')
    expect(w.isLocalDemo).toBe(true)
    expect(w.asWalletProvider().getCoinPublicKey()).toBe('local-demo-coin-pk')
  })

  it('wallet connect fails gracefully without extension', async () => {
    const w = createWalletStub()
    await expect(w.connect()).rejects.toThrow(/No Midnight wallet/)
    expect(w.status).toBe('unavailable')
  })
})

describe('dapp connector helpers', () => {
  const original = globalThis.window

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: original,
      configurable: true,
      writable: true,
    })
  })

  it('brands Lace / 1AM from name and key', () => {
    const lace = {
      name: 'Lace',
      rdns: 'io.lace.midnight',
      icon: '',
      apiVersion: '4.0.1',
      connect: async () => ({}) as never,
    } satisfies InitialAPI
    const oneam = {
      name: '1AM Wallet',
      rdns: 'network.1am.wallet',
      icon: '',
      apiVersion: '4.0.1',
      connect: async () => ({}) as never,
    } satisfies InitialAPI
    expect(brandFromWallet(lace, 'mnLace')).toBe('lace')
    expect(brandFromWallet(oneam, '1am')).toBe('1am')
    expect(brandFromWallet({ ...lace, name: 'Other', rdns: 'com.example' }, 'abc')).toBe('other')
  })

  it('lists injected wallets via Object.entries', () => {
    const fake: InitialAPI = {
      name: '1AM',
      rdns: 'network.1am',
      icon: '',
      apiVersion: '4.0.1',
      connect: async () => ({}) as never,
    }
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: { '1am': fake, uuidX: { ...fake, name: 'Lace' } } },
      configurable: true,
      writable: true,
    })
    const list = listInjectedWallets()
    expect(list.length).toBe(2)
    expect(list.every((w) => w.supportsConnect)).toBe(true)
    expect(selectWallet('uuidX').displayName).toBe('Lace')
    expect(selectWallet().brand).toBe('1am')
  })

  it('skips non-API junk on window.midnight', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: { noise: 1, empty: {}, ok: {
        name: '1AM',
        rdns: 'network.1am',
        icon: '',
        apiVersion: '4.0.1',
        connect: async () => ({}) as never,
      } } },
      configurable: true,
      writable: true,
    })
    expect(listInjectedWallets().map((w) => w.key)).toEqual(['ok'])
  })

  it('flags legacy enable-only Lace and recommends 1AM', () => {
    const legacy = {
      name: 'Lace',
      rdns: 'io.lace.midnight',
      icon: '',
      apiVersion: '3.0.0',
      enable: async () => ({}),
      isEnabled: async () => false,
    }
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: { mnLace: legacy } },
      configurable: true,
      writable: true,
    })
    const list = listInjectedWallets()
    expect(list).toHaveLength(1)
    expect(isLegacyV3Api(list[0]!.api)).toBe(true)
    expect(list[0]!.supportsConnect).toBe(false)
    const hint = buildConnectorHint(list)
    expect(hint.legacyMidnightLace).toBe(true)
    expect(hint.recommendedWallet).toBe('1am')
    expect(hint.summary).toMatch(/deprecated DApp Connector v3|enable\(\)/i)
  })

  it('detects Cardano Lace without Midnight injection', () => {
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: undefined, cardano: { lace: { name: 'Lace' } } },
      configurable: true,
      writable: true,
    })
    expect(listInjectedWallets()).toEqual([])
    const hint = buildConnectorHint([])
    expect(hint.cardanoLaceWithoutMidnight).toBe(true)
    expect(hint.recommendedWallet).toBe('1am')
    expect(hint.summary).toMatch(/Cardano connector|Midnight DApp Connector/i)
    expect(hasCardanoLaceInjection()).toBe(true)
    expect(describeInjectionGap([])).toMatch(/Lace is installed/)
  })

  it('connectWalletApi rejects legacy enable-only injectors', async () => {
    const legacy = {
      name: 'Lace',
      rdns: 'io.lace.midnight',
      icon: '',
      apiVersion: '3.0.0',
      enable: async () => ({}),
    }
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: { mnLace: legacy } },
      configurable: true,
      writable: true,
    })
    const wallet = selectWallet('mnLace')
    await expect(connectWalletApi(wallet, 'preprod')).rejects.toThrow(/legacy|connect\(networkId\)/i)
  })

  it('connectWalletApi reports network mismatch from getConnectionStatus', async () => {
    const api: InitialAPI = {
      name: '1AM',
      rdns: 'network.1am',
      icon: '',
      apiVersion: '4.0.1',
      connect: async () =>
        ({
          getUnshieldedAddress: async () => ({ unshieldedAddress: 'mn_addr_test' }),
          getShieldedAddresses: async () => ({
            shieldedAddress: 'mn_shield',
            shieldedCoinPublicKey: 'coin',
            shieldedEncryptionPublicKey: 'enc',
          }),
          getConfiguration: async () => ({
            indexerUri: '',
            indexerWsUri: '',
            substrateNodeUri: '',
            networkId: 'preview',
          }),
          getConnectionStatus: async () => ({ status: 'connected', networkId: 'preview' }),
        }) as never,
    }
    Object.defineProperty(globalThis, 'window', {
      value: { midnight: { '1am': api } },
      configurable: true,
      writable: true,
    })
    await expect(connectWalletApi(selectWallet(), 'preprod')).rejects.toThrow(/preview.*preprod|network/i)
  })

  it('formatConnectorError surfaces DAppConnectorAPIError codes', () => {
    const msg = formatConnectorError(
      { type: 'DAppConnectorAPIError', code: 'Rejected', reason: 'nope', message: 'nope' },
      { walletName: 'Lace', networkId: 'preprod' },
    )
    expect(msg).toMatch(/rejected/i)
    expect(msg).toMatch(/Lace|1AM|approve/i)
  })
})

describe('provider construction plan', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused')
      }),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects midnight-js packages as present', async () => {
    await expect(detectMidnightJsPackages()).resolves.toBe(true)
  })

  it('plans partial mode when packages present but stack down', async () => {
    const plan = await planProviderConstruction(NETWORKS.local)
    expect(plan.packagesPresent).toBe(true)
    expect(plan.health.stackReady).toBe(false)
    expect(plan.mode).toBe('partial')
    expect(plan.blockers.length).toBeGreaterThan(0)
    expect(plan.blueprint.setNetworkId).toContain('undeployed')
    expect(plan.blueprint.zkAssetBasePath).toBe(ZK_BROWSER_ASSET_BASE)
  })

  it('tryBuildLiveProviders returns stub bag when Docker down', async () => {
    const { live, providers, plan } = await tryBuildLiveProviders({ config: NETWORKS.local })
    expect(live).toBe(false)
    expect(plan.packagesPresent).toBe(true)
    expect(plan.mode).toBe('partial')
    await expect(providers.midnightProvider.submitTx({})).rejects.toThrow(/Providers not/)
  })

  it('dev private storage password passes midnight-js policy', () => {
    expect(() => validatePassword(DEV_PRIVATE_STORAGE_PASSWORD)).not.toThrow()
  })

  it('connection snapshot disables deploy without wallet/stack', () => {
    const snap = buildConnectionSnapshot({
      network: NETWORKS.local,
      walletStatus: 'local-demo',
      injectionStatus: 'not-found',
      walletLabel: 'Local demo',
      isLocalDemo: true,
      plan: {
        mode: 'partial',
        config: NETWORKS.local,
        health: {
          config: NETWORKS.local,
          proofServer: { name: 'proof-server', url: '', ok: false, detail: 'down' },
          indexer: { name: 'indexer', url: '', ok: false, detail: 'down' },
          node: { name: 'node', url: '', ok: false, detail: 'down' },
          proofServerReady: false,
          indexerReady: false,
          nodeReady: false,
          stackReady: false,
          disabledReasons: ['stack down'],
        },
        packagesPresent: true,
        blockers: ['stack down'],
        blueprint: {
          setNetworkId: "setNetworkId('undeployed')",
          privateStateStoreName: 'x',
          publicDataProvider: 'x',
          proofProvider: 'x',
          zkConfigProvider: 'x',
          zkAssetBasePath: '/zk',
        },
      },
    })
    expect(snap.localDemoPlayable).toBe(true)
    expect(snap.canDeploy).toBe(false)
    expect(snap.disabledReasons.some((r) => /Local demo/i.test(r))).toBe(true)
  })
})

describe('witnesses + compiled contract', () => {
  it('createInitialPrivateState yields valid location and keys', () => {
    const ps = createInitialPrivateState(() => {
      const b = new Uint8Array(32)
      b[0] = 0
      return b
    })
    expect(ps.carrotLocation).toBe(1)
    expect(ps.localSecretKey.length).toBe(32)
    expect(ps.carrotSalt.length).toBe(32)
  })

  it('witnesses return private fields without mutation', () => {
    const ps = createInitialPrivateState()
    const ctx = { privateState: ps } as never
    expect(carrotWitnesses.localSecretKey(ctx)[1]).toBe(ps.localSecretKey)
    expect(carrotWitnesses.carrotLocation(ctx)[1]).toBe(BigInt(ps.carrotLocation))
    expect(carrotWitnesses.carrotSalt(ctx)[1]).toBe(ps.carrotSalt)
  })

  it('getCompiledCarrotContract builds without network', async () => {
    const compiled = await getCompiledCarrotContract('/zk/carrot-game')
    expect(compiled).toBeTruthy()
    expect(compiled.tag).toBe('CarrotGame')
  })
})

describe('deploy / call service gating', () => {
  const blockedSnap = buildConnectionSnapshot({
    network: NETWORKS.local,
    walletStatus: 'local-demo',
    injectionStatus: 'not-found',
    walletLabel: 'Local demo',
    isLocalDemo: true,
    plan: {
      mode: 'partial',
      config: NETWORKS.local,
      health: {
        config: NETWORKS.local,
        proofServer: { name: 'proof-server', url: '', ok: false, detail: 'down' },
        indexer: { name: 'indexer', url: '', ok: false, detail: 'down' },
        node: { name: 'node', url: '', ok: false, detail: 'down' },
        proofServerReady: false,
        indexerReady: false,
        nodeReady: false,
        stackReady: false,
        disabledReasons: ['stack down'],
      },
      packagesPresent: true,
      blockers: ['stack down'],
      blueprint: {
        setNetworkId: "setNetworkId('undeployed')",
        privateStateStoreName: 'x',
        publicDataProvider: 'x',
        proofProvider: 'x',
        zkConfigProvider: 'x',
        zkAssetBasePath: '/zk',
      },
    },
  })

  it('gateDeployCall blocks local demo', () => {
    const gate = gateDeployCall(blockedSnap)
    expect(gate.ok).toBe(false)
    if (!gate.ok) {
      expect(gate.disabledReasons.length).toBeGreaterThan(0)
      expect(deployCallDisabledCopy(blockedSnap)).toEqual(gate.disabledReasons)
    }
  })

  it('deployCarrotGame returns disabled reasons without network', async () => {
    const result = await deployCarrotGame({ snapshot: blockedSnap })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.disabledReasons.some((r) => /Local demo|stack/i.test(r))).toBe(true)
      await expect(result.handle.callTx.settle()).rejects.toThrow()
    }
  })

  it('callCarrotCircuit returns disabled reasons without network', async () => {
    const result = await callCarrotCircuit({
      snapshot: blockedSnap,
      contractAddress: 'deadbeef',
      circuitId: 'settle',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0)
  })

  it('ready snapshot passes gate', () => {
    const ready = buildConnectionSnapshot({
      network: NETWORKS.local,
      walletStatus: 'connected',
      injectionStatus: 'detected',
      walletLabel: 'Lace',
      walletBrand: 'lace',
      isLocalDemo: false,
      plan: {
        mode: 'live-ready',
        config: NETWORKS.local,
        health: {
          config: NETWORKS.local,
          proofServer: { name: 'proof-server', url: 'x', ok: true, detail: 'ok' },
          indexer: { name: 'indexer', url: 'x', ok: true, detail: 'ok' },
          node: { name: 'node', url: 'x', ok: true, detail: 'ok' },
          proofServerReady: true,
          indexerReady: true,
          nodeReady: true,
          stackReady: true,
          disabledReasons: [],
        },
        packagesPresent: true,
        blockers: [],
        blueprint: {
          setNetworkId: "setNetworkId('undeployed')",
          privateStateStoreName: 'x',
          publicDataProvider: 'x',
          proofProvider: 'x',
          zkConfigProvider: 'x',
          zkAssetBasePath: '/zk',
        },
      },
    })
    expect(ready.canDeploy).toBe(true)
    expect(gateDeployCall(ready).ok).toBe(true)
  })
})
