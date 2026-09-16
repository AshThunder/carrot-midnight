import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import {
  LEGACY_CONNECTOR_MESSAGE,
  MISSING_MIDNIGHT_LACE_MESSAGE,
  NO_WALLET_MESSAGE,
  brandFromWallet,
  connectWalletApi,
  describeInjectionGap,
  formatConnectorError,
  listInjectedWallets,
  networkMismatchMessage,
  networksMatch,
  selectWallet,
  waitForWalletInjection,
} from './dappConnector'

type MidnightRoot = Record<string, unknown>

function v4Wallet(overrides: Partial<InitialAPI> & { connect?: InitialAPI['connect'] } = {}): InitialAPI {
  const connect =
    overrides.connect ??
    (async () => {
      throw new Error('connect not stubbed')
    })
  return {
    rdns: overrides.rdns ?? 'io.lace.wallet',
    name: overrides.name ?? 'Lace',
    icon: overrides.icon ?? 'https://www.lace.io/icon.png',
    apiVersion: overrides.apiVersion ?? '4.0.1',
    connect,
  }
}

function installMidnight(map: MidnightRoot) {
  ;(globalThis as unknown as { window: { midnight?: MidnightRoot; cardano?: unknown } }).window = {
    midnight: map,
  }
}

describe('dappConnector enumeration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete (globalThis as { window?: unknown }).window
  })

  it('returns empty when window.midnight is missing', () => {
    ;(globalThis as unknown as { window: Record<string, unknown> }).window = {}
    expect(listInjectedWallets()).toEqual([])
    expect(describeInjectionGap()).toBe(NO_WALLET_MESSAGE)
  })

  it('skips null and non-API entries', () => {
    installMidnight({
      junk: 'nope',
      empty: null,
      mnLace: v4Wallet({ name: 'Lace', rdns: 'io.lace.midnight' }),
    })
    const wallets = listInjectedWallets()
    expect(wallets).toHaveLength(1)
    expect(wallets[0]?.brand).toBe('lace')
    expect(wallets[0]?.key).toBe('mnLace')
    expect(wallets[0]?.supportsConnect).toBe(true)
  })

  it('recognizes UUID Lace and 1AM keys from name/rdns', () => {
    installMidnight({
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': v4Wallet({
        name: 'Lace',
        rdns: 'io.lace.wallet',
      }),
      '11111111-2222-3333-4444-555555555555': v4Wallet({
        name: '1AM',
        rdns: 'xyz.1am.wallet',
      }),
    })
    const wallets = listInjectedWallets()
    expect(wallets.map((w) => w.brand).sort()).toEqual(['1am', 'lace'])
  })

  it('brands mnLace / mnlace / lace keys as lace', () => {
    expect(brandFromWallet({ name: '', rdns: '', icon: '', apiVersion: '', connect: async () => ({}) as ConnectedAPI }, 'mnLace')).toBe(
      'lace',
    )
    expect(brandFromWallet({ name: 'Midnight Lace', rdns: 'com.example', icon: '', apiVersion: '', connect: async () => ({}) as ConnectedAPI }, 'uuid')).toBe(
      'lace',
    )
  })

  it('surfaces legacy enable()-only injectors without treating them as v4', () => {
    installMidnight({
      mnLace: {
        name: 'Lace',
        rdns: 'io.lace.wallet',
        enable: async () => ({}),
        isEnabled: async () => true,
      },
    })
    const wallets = listInjectedWallets()
    expect(wallets).toHaveLength(1)
    expect(wallets[0]?.legacyEnableOnly).toBe(true)
    expect(wallets[0]?.supportsConnect).toBe(false)
    expect(describeInjectionGap(wallets)).toBe(LEGACY_CONNECTOR_MESSAGE)
  })

  it('explains Cardano-only Lace when window.midnight is empty', () => {
    ;(globalThis as unknown as { window: { midnight?: unknown; cardano?: { lace: object } } }).window = {
      midnight: {},
      cardano: { lace: { enable: () => undefined } },
    }
    expect(listInjectedWallets()).toEqual([])
    expect(describeInjectionGap()).toBe(MISSING_MIDNIGHT_LACE_MESSAGE)
  })
})

describe('dappConnector selection', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('throws a clear message when nothing is injected', () => {
    ;(globalThis as unknown as { window: Record<string, unknown> }).window = {}
    expect(() => selectWallet()).toThrow(/No Midnight wallet/i)
  })

  it('selects by injection key, brand, or display name', () => {
    const lace = v4Wallet({ name: 'Lace' })
    const oneAm = v4Wallet({ name: '1AM', rdns: 'xyz.1am.wallet' })
    installMidnight({
      'uuid-lace': lace,
      'uuid-1am': oneAm,
    })
    expect(selectWallet('uuid-lace').brand).toBe('lace')
    expect(selectWallet('lace').brand).toBe('lace')
    expect(selectWallet('1AM').brand).toBe('1am')
  })

  it('prefers 1AM then Lace when no preference is given', () => {
    installMidnight({
      other: v4Wallet({ name: 'Other', rdns: 'com.other' }),
      laceKey: v4Wallet({ name: 'Lace', rdns: 'io.lace.wallet' }),
      am: v4Wallet({ name: '1AM', rdns: 'xyz.1am.wallet' }),
    })
    expect(selectWallet().brand).toBe('1am')
  })

  it('throws if the preferred key is not among injected wallets', () => {
    installMidnight({ am: v4Wallet({ name: '1AM', rdns: 'xyz.1am.wallet' }) })
    expect(() => selectWallet('missing-key')).toThrow(/not injected/i)
  })
})

describe('dappConnector connect', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  function connectedStub(opts: {
    networkId?: string
    status?: 'connected' | 'disconnected'
    unshielded?: string
    configNetwork?: string
  }): ConnectedAPI {
    return {
      getUnshieldedAddress: async () => ({ unshieldedAddress: opts.unshielded ?? 'mn_addr_preprod1abc' }),
      getShieldedAddresses: async () => ({
        shieldedAddress: 'mn_shield-addr_preprod1abc',
        shieldedCoinPublicKey: 'coin-pk',
        shieldedEncryptionPublicKey: 'enc-pk',
      }),
      getConfiguration: async () => ({
        indexerUri: '',
        indexerWsUri: '',
        substrateNodeUri: '',
        networkId: opts.configNetwork ?? opts.networkId ?? 'preprod',
      }),
      getConnectionStatus: async () =>
        opts.status === 'disconnected'
          ? { status: 'disconnected' as const }
          : { status: 'connected' as const, networkId: opts.networkId ?? 'preprod' },
    } as ConnectedAPI
  }

  it('calls connect(networkId) and returns addresses', async () => {
    const connect = vi.fn(async (networkId: string) => {
      expect(networkId).toBe('preprod')
      return connectedStub({ networkId: 'preprod' })
    })
    installMidnight({ mnLace: v4Wallet({ connect }) })
    const wallet = selectWallet('mnLace')
    const result = await connectWalletApi(wallet, 'preprod')
    expect(connect).toHaveBeenCalledOnce()
    expect(result.unshieldedAddress).toBe('mn_addr_preprod1abc')
    expect(result.shieldedCoinPublicKey).toBe('coin-pk')
  })

  it('refuses legacy enable()-only wallets with the v4 limitation', async () => {
    installMidnight({
      mnLace: { name: 'Lace', enable: async () => ({}), isEnabled: async () => true },
    })
    const wallet = selectWallet()
    await expect(connectWalletApi(wallet, 'preprod')).rejects.toThrow(LEGACY_CONNECTOR_MESSAGE)
  })

  it('tells the user to set Lace to Preprod on network mismatch', async () => {
    const connect = vi.fn(async () => connectedStub({ networkId: 'preview' }))
    installMidnight({ mnLace: v4Wallet({ connect }) })
    const wallet = selectWallet()
    await expect(connectWalletApi(wallet, 'preprod')).rejects.toThrow(/Set Lace \(Midnight network\) to Preprod/i)
  })

  it('formats rejected connector errors clearly', () => {
    const err = Object.assign(new Error('nope'), {
      type: 'DAppConnectorAPIError',
      code: 'Rejected',
      reason: 'User rejected',
    })
    expect(formatConnectorError(err, 'preprod')).toMatch(/Approve the prompt/i)
  })

  it('matches network ids case-insensitively', () => {
    expect(networksMatch('preprod', 'Preprod')).toBe(true)
    expect(networksMatch('preprod', 'preview')).toBe(false)
    expect(networkMismatchMessage('preprod', 'preview')).toMatch(/Preprod/)
  })
})

describe('waitForWalletInjection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as { window?: unknown }).window
  })

  it('returns wallets injected after a delay', async () => {
    const root: MidnightRoot = {}
    const win = {
      midnight: root,
      addEventListener() {},
      removeEventListener() {},
    }
    ;(globalThis as unknown as { window: typeof win }).window = win
    const pending = waitForWalletInjection(1000, 50)
    setTimeout(() => {
      root.mnLace = v4Wallet()
    }, 120)
    await vi.advanceTimersByTimeAsync(200)
    const wallets = await pending
    expect(wallets).toHaveLength(1)
    expect(wallets[0]?.brand).toBe('lace')
  })
})
