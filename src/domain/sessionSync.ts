/**
 * Cross-tab room session sync via localStorage + BroadcastChannel.
 * Same-origin only — enables local demo multi-tab play without a network.
 * Falls back to an in-memory map when Web Storage is unavailable (e.g. Vitest node).
 */
import type { CarrotLocation, FinalChoice, GameAccess, GamePhase, GameRecord } from './game'
import { joinCodeFromGameId, normalizeJoinCode } from './invite'

const SESSION_PREFIX = 'carrot-midnight:session:v1:'
const INDEX_KEY = 'carrot-midnight:session-index:v1'
const CHANNEL_NAME = 'carrot-midnight:room-sync:v1'
const SEAT_PREFIX = 'carrot-midnight:seat:v1:'

export type SyncedPrivate = {
  location: CarrotLocation
  salt: string
}

export type SyncedSession = {
  game: GameRecord
  joinCode: string
  private?: SyncedPrivate
  updatedAt: number
}

type WireGame = Omit<GameRecord, 'wager'> & { wager: string }

type WireSession = {
  game: WireGame
  joinCode: string
  private?: SyncedPrivate
  updatedAt: number
}

type SyncMessage =
  | { type: 'session'; session: WireSession }
  | { type: 'ping'; gameId: string }

const memorySessions = new Map<string, WireSession>()
let memoryIndex: string[] = []
const memorySeats = new Map<string, 'A' | 'B'>()

function storageAvailable(): boolean {
  try {
    if (typeof localStorage === 'undefined' || localStorage === null) return false
    const k = '__carrot_probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function sessionStorageAvailable(): boolean {
  try {
    if (typeof sessionStorage === 'undefined' || sessionStorage === null) return false
    const k = '__carrot_seat_probe__'
    sessionStorage.setItem(k, '1')
    sessionStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function sessionKey(gameId: string): string {
  return `${SESSION_PREFIX}${gameId}`
}

function toWire(session: SyncedSession): WireSession {
  return {
    ...session,
    game: { ...session.game, wager: session.game.wager.toString() },
  }
}

function fromWire(wire: WireSession): SyncedSession {
  return {
    joinCode: wire.joinCode,
    private: wire.private,
    updatedAt: wire.updatedAt,
    game: {
      ...wire.game,
      wager: BigInt(wire.game.wager),
      access: wire.game.access as GameAccess,
      phase: wire.game.phase as GamePhase,
      decision: wire.game.decision as FinalChoice | undefined,
      revealedLocation: wire.game.revealedLocation as CarrotLocation | undefined,
    },
  }
}

function readIndex(): string[] {
  if (!storageAvailable()) return [...memoryIndex]
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function writeIndex(ids: string[]) {
  const next = ids.slice(0, 60)
  memoryIndex = next
  if (!storageAvailable()) return
  localStorage.setItem(INDEX_KEY, JSON.stringify(next))
}

function broadcast(msg: SyncMessage) {
  try {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(CHANNEL_NAME)
    ch.postMessage(msg)
    ch.close()
  } catch {
    /* ignore */
  }
}

export function saveSyncedSession(session: SyncedSession): void {
  const wire = toWire(session)
  memorySessions.set(session.game.id, wire)
  if (storageAvailable()) {
    localStorage.setItem(sessionKey(session.game.id), JSON.stringify(wire))
  }
  const idx = readIndex().filter((id) => id !== session.game.id)
  idx.unshift(session.game.id)
  writeIndex(idx)
  broadcast({ type: 'session', session: wire })
}

export function loadSyncedSession(gameId: string): SyncedSession | null {
  if (storageAvailable()) {
    try {
      const raw = localStorage.getItem(sessionKey(gameId))
      if (raw) return fromWire(JSON.parse(raw) as WireSession)
    } catch {
      /* fall through to memory */
    }
  }
  const mem = memorySessions.get(gameId)
  return mem ? fromWire(mem) : null
}

export function findSessionByJoinCode(code: string): SyncedSession | null {
  const want = normalizeJoinCode(code)
  if (!want) return null
  for (const id of readIndex()) {
    const s = loadSyncedSession(id)
    if (!s) continue
    if (normalizeJoinCode(s.joinCode) === want || joinCodeFromGameId(s.game.id) === want) {
      return s
    }
  }
  for (const [id, wire] of memorySessions) {
    const s = fromWire(wire)
    if (normalizeJoinCode(s.joinCode) === want || joinCodeFromGameId(id) === want) return s
  }
  if (storageAvailable()) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(SESSION_PREFIX)) continue
      const s = loadSyncedSession(key.slice(SESSION_PREFIX.length))
      if (s && normalizeJoinCode(s.joinCode) === want) return s
    }
  }
  return null
}

export function clearSyncedSession(gameId: string): void {
  memorySessions.delete(gameId)
  memorySeats.delete(gameId)
  if (storageAvailable()) {
    localStorage.removeItem(sessionKey(gameId))
  }
  writeIndex(readIndex().filter((id) => id !== gameId))
}

/** Test helper — wipe in-memory session maps. */
export function clearAllSyncedSessionsForTests(): void {
  memorySessions.clear()
  memoryIndex = []
  memorySeats.clear()
}

export function getTabSeat(gameId: string): 'A' | 'B' | null {
  if (sessionStorageAvailable()) {
    const v = sessionStorage.getItem(`${SEAT_PREFIX}${gameId}`)
    return v === 'A' || v === 'B' ? v : null
  }
  return memorySeats.get(gameId) ?? null
}

export function setTabSeat(gameId: string, seat: 'A' | 'B'): void {
  memorySeats.set(gameId, seat)
  if (!sessionStorageAvailable()) return
  sessionStorage.setItem(`${SEAT_PREFIX}${gameId}`, seat)
}

/**
 * Subscribe to session updates for a game id (BroadcastChannel + storage event).
 * Returns an unsubscribe function.
 */
export function subscribeSyncedSession(
  gameId: string,
  onSession: (session: SyncedSession) => void,
): () => void {
  let ch: BroadcastChannel | null = null
  const handleMessage = (ev: MessageEvent) => {
    const data = ev.data as SyncMessage
    if (!data || data.type !== 'session') return
    if (data.session.game.id !== gameId) return
    onSession(fromWire(data.session))
  }
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key !== sessionKey(gameId) || !ev.newValue) return
    try {
      onSession(fromWire(JSON.parse(ev.newValue) as WireSession))
    } catch {
      /* ignore */
    }
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      ch = new BroadcastChannel(CHANNEL_NAME)
      ch.addEventListener('message', handleMessage)
    }
  } catch {
    ch = null
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage)
  }

  return () => {
    ch?.removeEventListener('message', handleMessage)
    ch?.close()
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage)
    }
  }
}

/** Build a fresh synced session payload from game + optional private witnesses. */
export function makeSyncedSession(
  game: GameRecord,
  priv?: SyncedPrivate | null,
): SyncedSession {
  return {
    game,
    joinCode: joinCodeFromGameId(game.id),
    private: priv ?? undefined,
    updatedAt: Date.now(),
  }
}
