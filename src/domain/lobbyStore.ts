import type { GameAccess, GameRecord } from './game'
import type { NetworkKey } from '@/midnight/knownContracts'
import { allowsOfflineSimulation } from './playMode'

const STORAGE_KEY_PREFIX = 'carrot-midnight:open-games:v1'

export type LobbyListing = {
  id: string
  access: GameAccess
  creatorId: string
  challengedPlayerId?: string
  wager: string
  createdAt: number
  status: 'OPEN' | 'TAKEN' | 'CANCELLED'
}

/** Stake filter used by the open floor UI. */
export type FloorStakeFilter = 'all' | 'low' | 'mid' | 'high'

let activeNetwork: NetworkKey = 'local'
/** Per-network in-memory fallback when localStorage is unavailable. */
const memoryByNetwork = new Map<NetworkKey, LobbyListing[]>()

export function setActiveLobbyNetwork(network: NetworkKey): void {
  activeNetwork = network
}

export function getActiveLobbyNetwork(): NetworkKey {
  return activeNetwork
}

function storageKey(network: NetworkKey): string {
  return `${STORAGE_KEY_PREFIX}:${network}`
}

function resolveNetwork(network?: NetworkKey): NetworkKey {
  return network ?? activeNetwork
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

function readAll(network: NetworkKey): LobbyListing[] {
  if (!storageAvailable()) return [...(memoryByNetwork.get(network) ?? [])]
  try {
    const raw = localStorage.getItem(storageKey(network))
    if (!raw) return []
    return JSON.parse(raw) as LobbyListing[]
  } catch {
    return []
  }
}

function writeAll(network: NetworkKey, items: LobbyListing[]) {
  const next = items.slice(0, 40)
  memoryByNetwork.set(network, next)
  if (!storageAvailable()) return
  localStorage.setItem(storageKey(network), JSON.stringify(next))
}

/** Offline lobby simulation is local-only; live nets never list or write. */
function offlineLobbyAllowed(network: NetworkKey): boolean {
  return allowsOfflineSimulation(network)
}

/**
 * Open floor = OPEN access only. DIRECT belongs under Direct Challenges / My Games
 * for creator + challenged, never on the public floor.
 */
export function isOpenFloorListing(g: Pick<LobbyListing, 'access'>): boolean {
  return g.access === 'OPEN'
}

/** Filter lobby listings for the public open floor (OPEN access + optional stake band). */
export function filterOpenFloor(
  listings: LobbyListing[],
  stakeFilter: FloorStakeFilter = 'all',
): LobbyListing[] {
  return listings.filter((g) => {
    if (!isOpenFloorListing(g)) return false
    const w = Number(g.wager)
    if (stakeFilter === 'low') return w <= 50
    if (stakeFilter === 'mid') return w > 50 && w <= 250
    if (stakeFilter === 'high') return w > 250
    return true
  })
}

export function listOpenGames(network?: NetworkKey): LobbyListing[] {
  const net = resolveNetwork(network)
  if (!offlineLobbyAllowed(net)) return []
  return readAll(net)
    .filter((g) => g.status === 'OPEN')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function upsertLobbyFromGame(game: GameRecord, network?: NetworkKey): void {
  const net = resolveNetwork(network)
  if (!offlineLobbyAllowed(net)) return
  const items = readAll(net).filter((g) => g.id !== game.id)
  const status: LobbyListing['status'] =
    game.phase === 'CANCELLED'
      ? 'CANCELLED'
      : game.phase === 'WAITING_FOR_OPPONENT'
        ? 'OPEN'
        : 'TAKEN'
  items.unshift({
    id: game.id,
    access: game.access,
    creatorId: game.creatorId,
    challengedPlayerId: game.challengedPlayerId,
    wager: game.wager.toString(),
    createdAt: game.createdAt,
    status,
  })
  writeAll(net, items)
}

export function markLobbyTaken(id: string, network?: NetworkKey): void {
  const net = resolveNetwork(network)
  if (!offlineLobbyAllowed(net)) return
  const items = readAll(net).map((g) => (g.id === id ? { ...g, status: 'TAKEN' as const } : g))
  writeAll(net, items)
}

export function markLobbyCancelled(id: string, network?: NetworkKey): void {
  const net = resolveNetwork(network)
  if (!offlineLobbyAllowed(net)) return
  const items = readAll(net).map((g) =>
    g.id === id ? { ...g, status: 'CANCELLED' as const } : g,
  )
  writeAll(net, items)
}

export function clearLobbyStore(network?: NetworkKey): void {
  if (network) {
    memoryByNetwork.set(network, [])
    if (storageAvailable()) localStorage.removeItem(storageKey(network))
    return
  }
  memoryByNetwork.clear()
  if (!storageAvailable()) return
  // Clear scoped keys + legacy unscoped key from older builds.
  const legacy = 'carrot-midnight:open-games:v1'
  localStorage.removeItem(legacy)
  for (const net of ['local', 'preview', 'preprod'] as NetworkKey[]) {
    localStorage.removeItem(storageKey(net))
  }
}
