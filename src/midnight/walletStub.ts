/**
 * Midnight wallet session — DApp Connector API patterns with local-demo fallback.
 *
 * Live path: enumerate window.midnight → InitialAPI.connect(networkId) → addresses.
 * Graceful when no extension: status unavailable + enableLocalDemo().
 */

import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import {
  connectWalletApi,
  listInjectedWallets,
  selectWallet,
  waitForWalletInjection,
  type DetectedWallet,
  type InjectionStatus,
  type WalletBrand,
} from './dappConnector'
import { getConfig } from './config'
import type { NetworkId, WalletProviderLike } from './types'

export type WalletStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'unavailable'
  | 'local-demo'

export interface MidnightWalletSession {
  status: WalletStatus
  injectionStatus: InjectionStatus
  address?: string
  coinPublicKey?: string
  encryptionPublicKey?: string
  label: string
  brand?: WalletBrand
  walletKey?: string
  detectedWallets: DetectedWallet[]
  connectedApi: ConnectedAPI | null
  isLocalDemo: boolean
  /** Poll for extension injection (async). */
  refreshInjection(timeoutMs?: number): Promise<DetectedWallet[]>
  /** Connect via DApp Connector; throws if none / rejected. */
  connect(opts?: { walletKey?: string; networkId?: NetworkId | string }): Promise<void>
  disconnect(): void
  /** Demo-only: pretend a local address without Lace/1AM. */
  enableLocalDemo(address?: string): void
  asWalletProvider(): WalletProviderLike
}

export function createWalletStub(): MidnightWalletSession {
  let status: WalletStatus = 'disconnected'
  let injectionStatus: InjectionStatus = typeof window === 'undefined' ? 'ssr' : 'checking'
  let address: string | undefined
  let coinPublicKey: string | undefined
  let encryptionPublicKey: string | undefined
  let label = 'Midnight wallet not connected'
  let brand: WalletBrand | undefined
  let walletKey: string | undefined
  let detectedWallets: DetectedWallet[] = []
  let connectedApi: ConnectedAPI | null = null
  let isLocalDemo = false

  const syncDetectionSync = () => {
    if (typeof window === 'undefined') {
      injectionStatus = 'ssr'
      detectedWallets = []
      return
    }
    detectedWallets = listInjectedWallets()
    injectionStatus = detectedWallets.length > 0 ? 'detected' : 'not-found'
  }

  // Immediate sync probe (extensions may inject later — callers should refreshInjection)
  if (typeof window !== 'undefined') {
    syncDetectionSync()
    if (detectedWallets.length === 0) injectionStatus = 'checking'
  }

  return {
    get status() {
      return status
    },
    get injectionStatus() {
      return injectionStatus
    },
    get address() {
      return address
    },
    get coinPublicKey() {
      return coinPublicKey
    },
    get encryptionPublicKey() {
      return encryptionPublicKey
    },
    get label() {
      return label
    },
    get brand() {
      return brand
    },
    get walletKey() {
      return walletKey
    },
    get detectedWallets() {
      return detectedWallets
    },
    get connectedApi() {
      return connectedApi
    },
    get isLocalDemo() {
      return isLocalDemo
    },
    async refreshInjection(timeoutMs = 6000) {
      injectionStatus = 'checking'
      detectedWallets = await waitForWalletInjection(timeoutMs)
      injectionStatus = detectedWallets.length > 0 ? 'detected' : 'not-found'
      if (status === 'disconnected' || status === 'unavailable') {
        if (detectedWallets.length === 0) {
          status = 'unavailable'
          label =
            'No Midnight wallet extension detected. Use local demo, or install Lace / 1AM and refresh.'
        } else {
          status = 'disconnected'
          const names = detectedWallets.map((w) => w.displayName).join(', ')
          label = `Detected: ${names}. Connect to authorize.`
        }
      }
      return detectedWallets
    },
    async connect(opts = {}) {
      status = 'connecting'
      isLocalDemo = false
      connectedApi = null
      label = 'Looking for DApp Connector wallets…'
      syncDetectionSync()
      if (detectedWallets.length === 0) {
        detectedWallets = await waitForWalletInjection(2500)
      }
      if (detectedWallets.length === 0) {
        status = 'unavailable'
        injectionStatus = 'not-found'
        label =
          'No Midnight wallet extension detected. Use local demo; enable Lace/1AM + Docker for live txs.'
        throw new Error(label)
      }
      injectionStatus = 'detected'
      const networkId = opts.networkId ?? getConfig().networkId
      try {
        const chosen = selectWallet(opts.walletKey)
        brand = chosen.brand
        walletKey = chosen.key
        label = `Connecting ${chosen.displayName} (${networkId})…`
        const result = await connectWalletApi(chosen, networkId)
        connectedApi = result.connected
        address = result.unshieldedAddress
        coinPublicKey = result.shieldedCoinPublicKey ?? `coin:${result.unshieldedAddress}`
        encryptionPublicKey =
          result.shieldedEncryptionPublicKey ?? `enc:${result.unshieldedAddress}`
        status = 'connected'
        const brandLabel =
          chosen.brand === '1am' ? '1AM' : chosen.brand === 'lace' ? 'Lace' : chosen.displayName
        label = `${brandLabel} · ${address.slice(0, 18)}…`
      } catch (e) {
        status = detectedWallets.length > 0 ? 'disconnected' : 'unavailable'
        connectedApi = null
        const msg = e instanceof Error ? e.message : String(e)
        label = msg
        throw e instanceof Error ? e : new Error(msg)
      }
    },
    disconnect() {
      status = detectedWallets.length > 0 ? 'disconnected' : 'unavailable'
      address = undefined
      coinPublicKey = undefined
      encryptionPublicKey = undefined
      brand = undefined
      walletKey = undefined
      connectedApi = null
      isLocalDemo = false
      label =
        detectedWallets.length > 0
          ? 'Midnight wallet disconnected'
          : 'No Midnight wallet extension detected. Use local demo.'
    },
    enableLocalDemo(demoAddress = 'mn_shield-addr_localdemo00000000000000000001') {
      status = 'local-demo'
      isLocalDemo = true
      connectedApi = null
      address = demoAddress
      coinPublicKey = 'local-demo-coin-pk'
      encryptionPublicKey = 'local-demo-enc-pk'
      brand = undefined
      walletKey = undefined
      label = `Local demo · ${demoAddress.slice(0, 18)}…`
    },
    asWalletProvider(): WalletProviderLike {
      const api = connectedApi
      if (api && !isLocalDemo) {
        return {
          getCoinPublicKey() {
            if (!coinPublicKey) throw new Error('Wallet not connected')
            return coinPublicKey
          },
          getEncryptionPublicKey() {
            if (!encryptionPublicKey) throw new Error('Wallet not connected')
            return encryptionPublicKey
          },
          async balanceTx(tx: unknown) {
            // Connector expects serialized tx string; bridge real midnight-js UnprovenTx in W1
            if (typeof tx !== 'string') {
              throw new Error(
                'balanceTx expects serialized tx string from midnight-js; use deployService when stack is ready',
              )
            }
            const balanced = await api.balanceUnsealedTransaction(tx)
            return balanced.tx
          },
        }
      }
      return {
        getCoinPublicKey() {
          if (!coinPublicKey) throw new Error('Wallet not connected')
          return coinPublicKey
        },
        getEncryptionPublicKey() {
          if (!encryptionPublicKey && !coinPublicKey) throw new Error('Wallet not connected')
          return encryptionPublicKey ?? `enc:${coinPublicKey}`
        },
        async balanceTx() {
          throw new Error(
            'balanceTx unavailable in local demo — connect Lace/1AM and run compose stack for live balancing',
          )
        },
      }
    },
  }
}

/** @deprecated alias — prefer createWalletStub / MidnightWalletSession */
export type MidnightWalletStub = MidnightWalletSession
