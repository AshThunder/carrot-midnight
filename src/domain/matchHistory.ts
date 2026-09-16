import type { FinalChoice, GameAccess, GamePhase, GameRecord } from './game'

const STORAGE_KEY = 'carrot-midnight:match-history:v1'
const MAX_ENTRIES = 80

export type MatchOutcome = 'SETTLED' | 'CANCELLED' | 'FORFEITED'

export type MatchHistoryEntry = {
  id: string
  access: GameAccess
  creatorId: string
  opponentId?: string
  wager: string
  pot: string
  phase: MatchOutcome
  decision?: FinalChoice
  revealedLocation?: 1 | 2
  winnerId?: string
  chatCount: number
  createdAt: number
  finishedAt: number
}

export type LeaderboardRow = {
  playerId: string
  wins: number
  losses: number
  forfeitsWon: number
  settled: number
  carrotsWon: number
}

let memoryStore: MatchHistoryEntry[] = []

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

function readAll(): MatchHistoryEntry[] {
  if (!storageAvailable()) return [...memoryStore]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MatchHistoryEntry[]
  } catch {
    return []
  }
}

function writeAll(items: MatchHistoryEntry[]) {
  const next = items.slice(0, MAX_ENTRIES)
  memoryStore = next
  if (!storageAvailable()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function potFromWager(wager: bigint | string): string {
  const w = typeof wager === 'bigint' ? wager : BigInt(wager)
  return (w * 2n).toString()
}

export function isTerminalPhase(phase: GamePhase): phase is MatchOutcome {
  return phase === 'SETTLED' || phase === 'CANCELLED' || phase === 'FORFEITED'
}

/** Record a finished match. Idempotent per game id (latest wins). */
export function recordMatch(game: GameRecord, finishedAt = Date.now()): MatchHistoryEntry | null {
  if (!isTerminalPhase(game.phase)) return null
  const entry: MatchHistoryEntry = {
    id: game.id,
    access: game.access,
    creatorId: game.creatorId,
    opponentId: game.opponentId,
    wager: game.wager.toString(),
    pot: potFromWager(game.wager),
    phase: game.phase,
    decision: game.decision,
    revealedLocation: game.revealedLocation,
    winnerId: game.winnerId,
    chatCount: game.chatCount ?? 0,
    createdAt: game.createdAt,
    finishedAt,
  }
  const items = readAll().filter((e) => e.id !== entry.id)
  items.unshift(entry)
  writeAll(items)
  return entry
}

export function listMatchHistory(): MatchHistoryEntry[] {
  return readAll().sort((a, b) => b.finishedAt - a.finishedAt)
}

export function clearMatchHistory(): void {
  memoryStore = []
  if (!storageAvailable()) return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Simple local leaderboard from settled + forfeited matches.
 * Cancelled games do not affect W/L. Pot credited only to winnerId.
 */
export function buildLeaderboard(entries = listMatchHistory()): LeaderboardRow[] {
  const map = new Map<string, LeaderboardRow>()

  const touch = (playerId: string): LeaderboardRow => {
    let row = map.get(playerId)
    if (!row) {
      row = {
        playerId,
        wins: 0,
        losses: 0,
        forfeitsWon: 0,
        settled: 0,
        carrotsWon: 0,
      }
      map.set(playerId, row)
    }
    return row
  }

  for (const e of entries) {
    if (e.phase === 'CANCELLED') continue
    touch(e.creatorId)
    if (e.opponentId) touch(e.opponentId)

    if (!e.winnerId) continue
    const pot = Number(e.pot) || 0
    const winner = touch(e.winnerId)
    winner.wins += 1
    winner.carrotsWon += pot
    if (e.phase === 'FORFEITED') winner.forfeitsWon += 1
    if (e.phase === 'SETTLED') winner.settled += 1

    const loserId =
      e.winnerId === e.creatorId ? e.opponentId : e.winnerId === e.opponentId ? e.creatorId : undefined
    if (loserId) touch(loserId).losses += 1
  }

  return [...map.values()].sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins
    if (y.carrotsWon !== x.carrotsWon) return y.carrotsWon - x.carrotsWon
    return x.playerId.localeCompare(y.playerId)
  })
}
