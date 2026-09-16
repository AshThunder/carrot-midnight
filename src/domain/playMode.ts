/**
 * Live-network vs offline-demo play gating.
 *
 * Preprod / Preview require a real Lace/1AM connection for gameplay actions.
 * Offline localStorage simulation is only allowed on the Local network.
 */
import type { NetworkKey } from '@/midnight/knownContracts'
import type { WalletStatus } from '@/midnight/walletStub'

/** Public Midnight testnets that must not silently fall back to local demo. */
export function isLiveNetwork(networkKey: NetworkKey): boolean {
  return networkKey === 'preprod' || networkKey === 'preview'
}

/**
 * Offline lobbyStore / sessionSync simulation is allowed only on `local`.
 * Local Demo always forces network to `local` before enabling.
 */
export function allowsOfflineSimulation(networkKey: NetworkKey): boolean {
  return networkKey === 'local'
}

/**
 * Whether create / join / accept / peek / decide / settle / on-chain-looking chat
 * may proceed for the current network + wallet.
 */
export function canPerformGameplay(
  networkKey: NetworkKey,
  walletStatus: WalletStatus,
): boolean {
  if (isLiveNetwork(networkKey)) {
    return walletStatus === 'connected'
  }
  // Local network: offline demo or connected local wallet both OK
  return true
}

/** True when UI is in offline localStorage simulation (not a live Lace session). */
export function isOfflineSimulationMode(
  networkKey: NetworkKey,
  walletStatus: WalletStatus,
): boolean {
  return allowsOfflineSimulation(networkKey) && walletStatus !== 'connected'
}

export function gameplayBlockedReason(
  networkKey: NetworkKey,
  walletStatus: WalletStatus,
): string | null {
  if (canPerformGameplay(networkKey, walletStatus)) return null

  if (walletStatus === 'local-demo') {
    return 'Local demo cannot run while Preprod/Preview is selected. Switch to LOCAL or connect Lace/1AM.'
  }
  if (walletStatus === 'connecting') {
    return 'Wallet connecting… finish authorizing Lace or 1AM to play.'
  }
  if (walletStatus === 'unavailable') {
    return 'No Midnight wallet detected. Install Lace or 1AM, or switch to LOCAL for offline demo.'
  }
  return 'Connect Lace or 1AM to play on this network. Proof server :6300 and the Preprod faucet may be required.'
}

/** Human label for the network pill — never claim Preprod while in local-demo. */
export function networkModeLabel(
  networkKey: NetworkKey,
  walletStatus: WalletStatus,
): string {
  if (walletStatus === 'local-demo' && networkKey === 'local') return 'Local demo'
  if (networkKey === 'preprod') return 'Preprod'
  if (networkKey === 'preview') return 'Preview'
  if (walletStatus === 'connected') return 'Local'
  return 'Local'
}

export function welcomeNetworkLabel(
  networkKey: NetworkKey,
  walletStatus: WalletStatus,
): string {
  if (walletStatus === 'local-demo' && networkKey === 'local') return 'Local demo (offline)'
  if (networkKey === 'preprod') return 'Preprod · Midnight'
  if (networkKey === 'preview') return 'Preview · Midnight'
  return 'Local · Midnight'
}
