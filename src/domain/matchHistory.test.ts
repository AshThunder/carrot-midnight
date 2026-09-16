import { beforeEach, describe, expect, it } from 'vitest'
import type { GameRecord } from './game'
import {
  buildLeaderboard,
  clearMatchHistory,
  isTerminalPhase,
  listMatchHistory,
  potFromWager,
  recordMatch,
} from './matchHistory'

const settled: GameRecord = {
  id: 'm1',
  access: 'OPEN',
  creatorId: 'alice',
  opponentId: 'bob',
  wager: 100n,
  phase: 'SETTLED',
  createdAt: 1_000,
  decision: 'KEEP',
  revealedLocation: 1,
  winnerId: 'alice',
  chatCount: 2,
}

describe('matchHistory', () => {
  beforeEach(() => {
    clearMatchHistory()
  })

  it('pots are 2× wager', () => {
    expect(potFromWager(50n)).toBe('100')
    expect(potFromWager('25')).toBe('50')
  })

  it('only records terminal phases', () => {
    expect(isTerminalPhase('WAITING_FOR_DECISION')).toBe(false)
    expect(isTerminalPhase('SETTLED')).toBe(true)
    expect(recordMatch({ ...settled, phase: 'WAITING_FOR_REVEAL' })).toBeNull()
  })

  it('persists settled/cancelled/forfeited and is idempotent per id', () => {
    recordMatch(settled, 2_000)
    recordMatch({ ...settled, chatCount: 9 }, 3_000)
    expect(listMatchHistory()).toHaveLength(1)
    expect(listMatchHistory()[0]?.chatCount).toBe(9)

    recordMatch(
      {
        ...settled,
        id: 'm2',
        phase: 'FORFEITED',
        winnerId: 'alice',
        decision: undefined,
        revealedLocation: undefined,
      },
      4_000,
    )
    recordMatch(
      {
        ...settled,
        id: 'm3',
        phase: 'CANCELLED',
        opponentId: undefined,
        winnerId: undefined,
        decision: undefined,
      },
      5_000,
    )
    expect(listMatchHistory().map((e) => e.phase)).toEqual(['CANCELLED', 'FORFEITED', 'SETTLED'])
  })

  it('builds leaderboard from wins and pots (ignores cancelled)', () => {
    recordMatch(settled, 1)
    recordMatch(
      {
        ...settled,
        id: 'm2',
        winnerId: 'bob',
        decision: 'SWAP',
        revealedLocation: 1,
      },
      2,
    )
    recordMatch(
      {
        ...settled,
        id: 'm3',
        phase: 'FORFEITED',
        winnerId: 'alice',
        decision: undefined,
        revealedLocation: undefined,
      },
      3,
    )
    recordMatch(
      {
        ...settled,
        id: 'm4',
        phase: 'CANCELLED',
        winnerId: undefined,
      },
      4,
    )

    const board = buildLeaderboard()
    const alice = board.find((r) => r.playerId === 'alice')
    const bob = board.find((r) => r.playerId === 'bob')
    expect(alice?.wins).toBe(2)
    expect(alice?.forfeitsWon).toBe(1)
    expect(alice?.settled).toBe(1)
    expect(alice?.carrotsWon).toBe(400) // 200 + 200
    expect(bob?.wins).toBe(1)
    expect(bob?.losses).toBe(2)
    expect(board[0]?.playerId).toBe('alice')
  })
})
