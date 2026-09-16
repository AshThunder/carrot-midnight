import type { GameAccess, GameRecord } from './game'

const STORAGE_KEY = 'carrot-midnight:open-games:v1'

export type LobbyListing = {
  id: string
  access: GameAccess
  creatorId: string
  challengedPlayerId?: string
  wager: string
  createdAt: number
  status: 'OPEN' | 'TAKEN' | 'CANCELLED'
}

let memoryStore: LobbyListing[] = []

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

function readAll(): LobbyListing[] {
  if (!storageAvailable()) return [...memoryStore]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as LobbyListing[]
  } catch {
    return []
  }
}

function writeAll(items: LobbyListing[]) {
  const next = items.slice(0, 40)
  memoryStore = next
  if (!storageAvailable()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function listOpenGames(): LobbyListing[] {
  return readAll()
    .filter((g) => g.status === 'OPEN')
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function upsertLobbyFromGame(game: GameRecord): void {
  const items = readAll().filter((g) => g.id !== game.id)
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
  writeAll(items)
}

export function markLobbyTaken(id: string): void {
  const items = readAll().map((g) => (g.id === id ? { ...g, status: 'TAKEN' as const } : g))
  writeAll(items)
}

export function markLobbyCancelled(id: string): void {
  const items = readAll().map((g) => (g.id === id ? { ...g, status: 'CANCELLED' as const } : g))
  writeAll(items)
}

export function clearLobbyStore(): void {
  memoryStore = []
  if (!storageAvailable()) return
  localStorage.removeItem(STORAGE_KEY)
}
