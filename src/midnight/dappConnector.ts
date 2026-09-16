/**
 * DApp Connector helpers — enumerate window.midnight wallets (CAIP-372 style).
 * Never hardcode a single wallet key for selection; label Lace / 1AM from name/rdns/key.
 */

import '@midnight-ntwrk/dapp-connector-api'
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import type { NetworkId } from './types'

export type WalletBrand = '1am' | 'lace' | 'other'

export type DetectedWallet = {
  /** Injection key under window.midnight (UUID or legacy string). */
  key: string
  api: InitialAPI
  brand: WalletBrand
  displayName: string
}

export type InjectionStatus = 'checking' | 'detected' | 'not-found' | 'ssr'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/** Infer brand for UI labels only — selection still uses Object.entries. */
export function brandFromWallet(api: InitialAPI, key: string): WalletBrand {
  const hay = `${api.name ?? ''} ${api.rdns ?? ''} ${key}`.toLowerCase()
  if (hay.includes('1am') || hay.includes('oneam') || key === '1am') return '1am'
  if (hay.includes('lace') || hay.includes('mnlace') || key === 'mnLace') return 'lace'
  return 'other'
}

export function listInjectedWallets(): DetectedWallet[] {
  if (!isBrowser()) return []
  const injected = window.midnight
  if (!injected) return []
  return Object.entries(injected).map(([key, api]) => {
    const brand = brandFromWallet(api, key)
    const displayName =
      typeof api.name === 'string' && api.name.trim().length > 0
        ? api.name
        : brand === '1am'
          ? '1AM'
          : brand === 'lace'
            ? 'Lace'
            : key
    return { key, api, brand, displayName }
  })
}

/**
 * Poll briefly for async extension injection.
 * Resolves with wallets found, or [] after timeout.
 */
export async function waitForWalletInjection(
  timeoutMs = 6000,
  intervalMs = 250,
): Promise<DetectedWallet[]> {
  if (!isBrowser()) return []
  const started = Date.now()
  for (;;) {
    const wallets = listInjectedWallets()
    if (wallets.length > 0) return wallets
    if (Date.now() - started >= timeoutMs) return []
    await new Promise((r) => setTimeout(r, intervalMs))
  }
}

export function selectWallet(preferredKey?: string): DetectedWallet {
  const wallets = listInjectedWallets()
  if (wallets.length === 0) {
    throw new Error(
      'No Midnight wallet extension detected. Install Lace or 1AM, then refresh — or use local demo.',
    )
  }
  if (preferredKey) {
    const match = wallets.find((w) => w.key === preferredKey)
    if (match) return match
  }
  // Prefer 1AM then Lace when multiple; otherwise first entry
  return (
    wallets.find((w) => w.brand === '1am') ??
    wallets.find((w) => w.brand === 'lace') ??
    wallets[0]
  )
}

export async function connectWalletApi(
  wallet: DetectedWallet,
  networkId: NetworkId | string,
): Promise<{
  connected: ConnectedAPI
  unshieldedAddress: string
  shieldedCoinPublicKey?: string
  shieldedEncryptionPublicKey?: string
  configuration?: Awaited<ReturnType<ConnectedAPI['getConfiguration']>>
}> {
  const connected = await wallet.api.connect(String(networkId))
  const { unshieldedAddress } = await connected.getUnshieldedAddress()
  let shieldedCoinPublicKey: string | undefined
  let shieldedEncryptionPublicKey: string | undefined
  try {
    const shielded = await connected.getShieldedAddresses()
    shieldedCoinPublicKey = shielded.shieldedCoinPublicKey
    shieldedEncryptionPublicKey = shielded.shieldedEncryptionPublicKey
  } catch {
    // Some wallets may defer shielded until needed
  }
  let configuration: Awaited<ReturnType<ConnectedAPI['getConfiguration']>> | undefined
  try {
    configuration = await connected.getConfiguration()
  } catch {
    // optional
  }
  try {
    const status = await connected.getConnectionStatus()
    if (status.status !== 'connected') {
      throw new Error(`Wallet reported status: ${status.status}`)
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Wallet reported')) throw e
  }
  return {
    connected,
    unshieldedAddress,
    shieldedCoinPublicKey,
    shieldedEncryptionPublicKey,
    configuration,
  }
}

export function injectionStatusFromList(
  wallets: DetectedWallet[],
  checking: boolean,
): InjectionStatus {
  if (!isBrowser()) return 'ssr'
  if (checking) return 'checking'
  return wallets.length > 0 ? 'detected' : 'not-found'
}
