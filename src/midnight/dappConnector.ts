/**
 * DApp Connector helpers — enumerate window.midnight wallets (CAIP-372 style).
 * Never hardcode a single wallet key for selection; label Lace / 1AM from name/rdns/key.
 *
 * API: @midnight-ntwrk/dapp-connector-api v4 connect(networkId).
 * Official React guide: Object.values(window.midnight), not window.midnight.mnLace.
 * 1AM ships Connector v4. Public Lace (Chrome Web Store) injects Midnight only after
 * a Midnight wallet is created inside Lace and set to the matching network.
 */

import '@midnight-ntwrk/dapp-connector-api'
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api'
import { ErrorCodes } from '@midnight-ntwrk/dapp-connector-api'
import type { NetworkId } from './types'

export type WalletBrand = '1am' | 'lace' | 'other'
export type WalletCompat = 'v4' | 'legacy-v3'

export type DetectedWallet = {
  /** Injection key under window.midnight (UUID or legacy string). */
  key: string
  api: InitialAPI
  brand: WalletBrand
  displayName: string
  compat: WalletCompat
  supportsConnect: boolean
  legacyEnableOnly: boolean
  apiVersion?: string
}

export type InjectionStatus = 'checking' | 'detected' | 'not-found' | 'ssr'

const INJECTION_EVENTS = [
  'midnight#initialized',
  'midnight:initialized',
  'caip372:announceProvider',
] as const

export const LEGACY_CONNECTOR_MESSAGE =
  'This wallet exposes the deprecated DApp Connector v3 enable()/isEnabled() API. Carrot Midnight requires Connector v4 connect(networkId). Update Lace from the Chrome Web Store (Midnight inside Lace) or use 1AM, then refresh.'

export const MISSING_MIDNIGHT_LACE_MESSAGE =
  'Lace is installed (Cardano connector found) but no Midnight DApp Connector is injected on window.midnight. In Lace: Add wallet → Midnight, set network to Preprod, unlock, then refresh / Rescan. 1AM also works if installed.'

export const NO_WALLET_MESSAGE =
  'No Midnight wallet extension detected. Install Lace or 1AM, create a Midnight wallet, set it to Preprod, then refresh — or use local demo on LOCAL.'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function hasFn(value: Record<string, unknown>, name: string): boolean {
  return typeof value[name] === 'function'
}

/** v4 InitialAPI — connect(networkId) is the required method. */
export function isV4InitialApi(value: unknown): value is InitialAPI {
  return isRecord(value) && hasFn(value, 'connect')
}

/** Pre-4.0 Lace Midnight Preview used enable()/isEnabled() instead of connect(). */
export function isLegacyV3Api(value: unknown): boolean {
  return isRecord(value) && hasFn(value, 'enable') && !hasFn(value, 'connect')
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** Infer brand for UI labels only — selection still enumerates all keys. */
export function brandFromWallet(
  api: Pick<InitialAPI, 'name' | 'rdns'> | Record<string, unknown>,
  key: string,
): WalletBrand {
  const rec = api as Record<string, unknown>
  const hay = `${readString(rec.name)} ${readString(rec.rdns)} ${readString(rec.icon)} ${key}`.toLowerCase()
  if (
    hay.includes('1am') ||
    hay.includes('oneam') ||
    hay.includes('one-am') ||
    key === '1am' ||
    hay.includes('xyz.1am')
  ) {
    return '1am'
  }
  if (
    hay.includes('lace') ||
    hay.includes('mnlace') ||
    hay.includes('io.lace') ||
    hay.includes('inputoutput') ||
    key === 'mnLace' ||
    key === 'lace'
  ) {
    return 'lace'
  }
  return 'other'
}

function displayNameFor(api: InitialAPI | Record<string, unknown>, brand: WalletBrand, key: string): string {
  const name = readString((api as { name?: unknown }).name).trim()
  if (name.length > 0) return name
  if (brand === '1am') return '1AM'
  if (brand === 'lace') return 'Lace'
  return key
}

function toDetected(key: string, raw: unknown): DetectedWallet | null {
  if (isV4InitialApi(raw)) {
    const brand = brandFromWallet(raw, key)
    return {
      key,
      api: raw,
      brand,
      displayName: displayNameFor(raw, brand, key),
      compat: 'v4',
      supportsConnect: true,
      legacyEnableOnly: false,
      apiVersion: readString(raw.apiVersion) || undefined,
    }
  }
  if (isLegacyV3Api(raw) && isRecord(raw)) {
    const brand = brandFromWallet(raw, key)
    const stub = raw as unknown as InitialAPI
    return {
      key,
      api: stub,
      brand,
      displayName: displayNameFor(raw, brand, key),
      compat: 'legacy-v3',
      supportsConnect: false,
      legacyEnableOnly: true,
      apiVersion: readString((raw as { apiVersion?: unknown }).apiVersion) || undefined,
    }
  }
  return null
}

/** Own enumerable + non-enumerable string keys (UUID injectors vary). */
export function readMidnightEntries(): Array<[string, unknown]> {
  if (!isBrowser()) return []
  const injected = window.midnight
  if (!injected || typeof injected !== 'object') return []
  const keys = new Set<string>([
    ...Object.keys(injected),
    ...Object.getOwnPropertyNames(injected).filter((k) => k !== 'constructor'),
  ])
  const out: Array<[string, unknown]> = []
  for (const key of keys) {
    if (key === '__proto__' || key === 'prototype') continue
    try {
      out.push([key, (injected as Record<string, unknown>)[key]])
    } catch {
      // skip throwing getters
    }
  }
  return out
}

export function listInjectedWallets(): DetectedWallet[] {
  const seen = new Set<string>()
  const wallets: DetectedWallet[] = []
  for (const [key, raw] of readMidnightEntries()) {
    const detected = toDetected(key, raw)
    if (!detected || seen.has(detected.key)) continue
    seen.add(detected.key)
    wallets.push(detected)
  }
  return wallets
}

export function listConnectableWallets(): DetectedWallet[] {
  return listInjectedWallets().filter((w) => w.compat === 'v4')
}

export function hasCardanoLaceInjection(): boolean {
  if (!isBrowser()) return false
  const cardano = (window as unknown as { cardano?: Record<string, unknown> }).cardano
  return isRecord(cardano) && isRecord(cardano.lace)
}

export function describeInjectionGap(wallets: DetectedWallet[] = listInjectedWallets()): string {
  if (wallets.some((w) => w.compat === 'v4')) return ''
  if (wallets.some((w) => w.compat === 'legacy-v3')) return LEGACY_CONNECTOR_MESSAGE
  if (hasCardanoLaceInjection()) return MISSING_MIDNIGHT_LACE_MESSAGE
  return NO_WALLET_MESSAGE
}

/**
 * Poll briefly for async extension injection (and CAIP-372 announce events).
 * Resolves with wallets found, or [] after timeout.
 */
export async function waitForWalletInjection(
  timeoutMs = 6000,
  intervalMs = 250,
): Promise<DetectedWallet[]> {
  if (!isBrowser()) return []
  const started = Date.now()
  let announced = false
  const onAnnounce = () => {
    announced = true
  }
  for (const ev of INJECTION_EVENTS) {
    window.addEventListener(ev, onAnnounce)
  }
  try {
    for (;;) {
      const wallets = listInjectedWallets()
      if (wallets.length > 0) return wallets
      if (announced) {
        const again = listInjectedWallets()
        if (again.length > 0) return again
      }
      if (Date.now() - started >= timeoutMs) return []
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  } finally {
    for (const ev of INJECTION_EVENTS) {
      window.removeEventListener(ev, onAnnounce)
    }
  }
}

function matchesPreferred(wallet: DetectedWallet, preferred: string): boolean {
  const p = preferred.trim().toLowerCase()
  if (!p) return false
  if (wallet.key.toLowerCase() === p) return true
  if (wallet.displayName.toLowerCase() === p) return true
  if (wallet.brand === p) return true
  if (p === 'lace' && wallet.brand === 'lace') return true
  if ((p === '1am' || p === 'oneam') && wallet.brand === '1am') return true
  return false
}

export function selectWallet(preferredKey?: string): DetectedWallet {
  const wallets = listInjectedWallets()
  if (wallets.length === 0) {
    throw new Error(describeInjectionGap(wallets))
  }
  if (preferredKey) {
    const match = wallets.find((w) => matchesPreferred(w, preferredKey))
    if (match) return match
    throw new Error(
      `Wallet "${preferredKey}" is not injected. Detected: ${wallets.map((w) => w.displayName).join(', ') || 'none'}. Rescan after unlocking Lace/1AM.`,
    )
  }
  const connectable = wallets.filter((w) => w.compat === 'v4')
  const pool = connectable.length > 0 ? connectable : wallets
  return pool.find((w) => w.brand === '1am') ?? pool.find((w) => w.brand === 'lace') ?? pool[0]
}

export function normalizeNetworkId(id: string): string {
  return id.trim().toLowerCase()
}

export function networksMatch(requested: string, actual?: string | null): boolean {
  if (!actual) return true
  return normalizeNetworkId(requested) === normalizeNetworkId(actual)
}

export function networkMismatchMessage(requested: string, actual: string): string {
  const want = normalizeNetworkId(requested)
  const hint =
    want === 'preprod'
      ? 'Set Lace (Midnight network) to Preprod, then reconnect.'
      : want === 'preview'
        ? 'Set Lace (Midnight network) to Preview, then reconnect.'
        : want === 'undeployed'
          ? 'Set the wallet network to local/undeployed, then reconnect.'
          : `Set the wallet network to ${requested}, then reconnect.`
  return `Wallet is on ${actual}, but this app is on ${requested}. ${hint}`
}

type ConnectorThrown = {
  type?: string
  code?: string
  reason?: string
  message?: string
}

export function buildConnectorHint(wallets: DetectedWallet[] = listInjectedWallets()): {
  summary: string
  cardanoLaceWithoutMidnight: boolean
  legacyMidnightLace: boolean
  recommendedWallet: '1am' | 'lace' | null
} {
  const hasV4 = wallets.some((w) => w.compat === 'v4')
  const legacyMidnightLace = wallets.some((w) => w.compat === 'legacy-v3')
  const cardanoLaceWithoutMidnight = !hasV4 && !legacyMidnightLace && hasCardanoLaceInjection()
  const summary = describeInjectionGap(wallets)
  const recommendedWallet: '1am' | 'lace' | null = hasV4
    ? wallets.some((w) => w.brand === '1am' && w.compat === 'v4')
      ? '1am'
      : wallets.some((w) => w.brand === 'lace' && w.compat === 'v4')
        ? 'lace'
        : '1am'
    : '1am'
  return { summary, cardanoLaceWithoutMidnight, legacyMidnightLace, recommendedWallet }
}

export function formatConnectorError(
  error: unknown,
  networkIdOrOpts?: string | { networkId?: string; walletName?: string },
): string {
  const networkId = typeof networkIdOrOpts === 'string' ? networkIdOrOpts : networkIdOrOpts?.networkId
  const isApi =
    !!error &&
    typeof error === 'object' &&
    (error as ConnectorThrown).type === 'DAppConnectorAPIError'
  if (error instanceof Error && error.message && !isApi) {
    const msg = error.message
    if (/network/i.test(msg) && networkId) {
      return `${msg} ${networkMismatchMessage(networkId, 'a different network')}`
    }
    return msg
  }
  const apiErr = error as ConnectorThrown
  if (apiErr && apiErr.type === 'DAppConnectorAPIError') {
    const code = apiErr.code
    if (code === ErrorCodes.Rejected || code === ErrorCodes.PermissionRejected) {
      return 'Connection rejected in the wallet. Approve the prompt in Lace or 1AM and try again.'
    }
    if (code === ErrorCodes.Disconnected) {
      return 'Wallet disconnected. Unlock Lace or 1AM and connect again.'
    }
    const reason = apiErr.reason || apiErr.message || code || 'Wallet request failed'
    if (/network/i.test(String(reason)) && networkId) {
      return `${reason} Set Lace or 1AM to ${networkId === 'preprod' ? 'Preprod' : networkId}.`
    }
    return String(reason)
  }
  return error instanceof Error ? error.message : String(error)
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
  const wanted = String(networkId)
  if (wallet.compat === 'legacy-v3' || typeof wallet.api.connect !== 'function') {
    throw new Error(LEGACY_CONNECTOR_MESSAGE)
  }
  let connected: ConnectedAPI
  try {
    connected = await wallet.api.connect(wanted)
  } catch (e) {
    throw new Error(formatConnectorError(e, wanted))
  }

  let unshieldedAddress = ''
  try {
    const unshielded = await connected.getUnshieldedAddress()
    unshieldedAddress = unshielded.unshieldedAddress
  } catch {
    // some builds expose shielded first
  }
  let shieldedCoinPublicKey: string | undefined
  let shieldedEncryptionPublicKey: string | undefined
  try {
    const shielded = await connected.getShieldedAddresses()
    shieldedCoinPublicKey = shielded.shieldedCoinPublicKey
    shieldedEncryptionPublicKey = shielded.shieldedEncryptionPublicKey
    if (!unshieldedAddress) unshieldedAddress = shielded.shieldedAddress
  } catch {
    // Some wallets may defer shielded until needed
  }
  if (!unshieldedAddress) {
    throw new Error(
      `${wallet.displayName} connected but returned no address. Unlock the Midnight wallet and retry.`,
    )
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
    if (status.networkId && !networksMatch(wanted, status.networkId)) {
      throw new Error(networkMismatchMessage(wanted, status.networkId))
    }
  } catch (e) {
    if (e instanceof Error && (e.message.startsWith('Wallet reported') || e.message.startsWith('Wallet is on'))) {
      throw e
    }
  }
  if (configuration?.networkId && !networksMatch(wanted, configuration.networkId)) {
    throw new Error(networkMismatchMessage(wanted, configuration.networkId))
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
