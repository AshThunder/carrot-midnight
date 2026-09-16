import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLobbyStore,
  listOpenGames,
  markLobbyCancelled,
  markLobbyTaken,
  upsertLobbyFromGame,
} from './lobbyStore'
import type { GameRecord } from './game'

const base: GameRecord = {
  id: 'g1',
  access: 'OPEN',
  creatorId: 'alice',
  wager: 50n,
  phase: 'WAITING_FOR_OPPONENT',
  createdAt: 100,
}

describe('lobbyStore', () => {
  beforeEach(() => {
    clearLobbyStore()
  })

  it('lists open games and marks taken/cancelled', () => {
    upsertLobbyFromGame(base)
    expect(listOpenGames()).toHaveLength(1)
    expect(listOpenGames()[0]?.wager).toBe('50')

    markLobbyTaken('g1')
    expect(listOpenGames()).toHaveLength(0)

    upsertLobbyFromGame({ ...base, id: 'g2' })
    markLobbyCancelled('g2')
    expect(listOpenGames()).toHaveLength(0)
  })
})
