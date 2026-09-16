import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLobbyStore,
  filterOpenFloor,
  isOpenFloorListing,
  listOpenGames,
  markLobbyCancelled,
  markLobbyTaken,
  setActiveLobbyNetwork,
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

const direct: GameRecord = {
  id: 'g-direct',
  access: 'DIRECT',
  creatorId: 'alice',
  challengedPlayerId: 'bob',
  wager: 100n,
  phase: 'WAITING_FOR_OPPONENT',
  createdAt: 200,
}

describe('lobbyStore', () => {
  beforeEach(() => {
    clearLobbyStore()
    setActiveLobbyNetwork('local')
  })

  it('lists open games and marks taken/cancelled on local', () => {
    upsertLobbyFromGame(base)
    expect(listOpenGames()).toHaveLength(1)
    expect(listOpenGames()[0]?.wager).toBe('50')

    markLobbyTaken('g1')
    expect(listOpenGames()).toHaveLength(0)

    upsertLobbyFromGame({ ...base, id: 'g2' })
    markLobbyCancelled('g2')
    expect(listOpenGames()).toHaveLength(0)
  })

  it('scopes storage by network — local listings do not appear on preprod', () => {
    setActiveLobbyNetwork('local')
    upsertLobbyFromGame(base)
    expect(listOpenGames('local')).toHaveLength(1)

    setActiveLobbyNetwork('preprod')
    expect(listOpenGames('preprod')).toHaveLength(0)
    expect(listOpenGames()).toHaveLength(0)

    // Writes on live nets are no-ops
    upsertLobbyFromGame({ ...base, id: 'g-preprod' }, 'preprod')
    expect(listOpenGames('preprod')).toHaveLength(0)

    // Local still has its listing
    expect(listOpenGames('local')).toHaveLength(1)
  })

  it('returns empty and does not write on preview', () => {
    setActiveLobbyNetwork('preview')
    upsertLobbyFromGame(base, 'preview')
    expect(listOpenGames('preview')).toEqual([])
  })
})

describe('filterOpenFloor', () => {
  const listings = [
    {
      id: 'open-low',
      access: 'OPEN' as const,
      creatorId: 'a',
      wager: '40',
      createdAt: 1,
      status: 'OPEN' as const,
    },
    {
      id: 'open-mid',
      access: 'OPEN' as const,
      creatorId: 'a',
      wager: '100',
      createdAt: 2,
      status: 'OPEN' as const,
    },
    {
      id: 'direct-bob',
      access: 'DIRECT' as const,
      creatorId: 'a',
      challengedPlayerId: 'bob',
      wager: '50',
      createdAt: 3,
      status: 'OPEN' as const,
    },
    {
      id: 'direct-orphan',
      access: 'DIRECT' as const,
      creatorId: 'a',
      wager: '50',
      createdAt: 4,
      status: 'OPEN' as const,
    },
  ]

  it('includes only OPEN access — never DIRECT (even for challenged or orphan)', () => {
    const floor = filterOpenFloor(listings, 'all')
    expect(floor.map((g) => g.id)).toEqual(['open-low', 'open-mid'])
    expect(listings.every((g) => (g.access === 'OPEN') === isOpenFloorListing(g))).toBe(true)
  })

  it('applies stake filters only among OPEN listings', () => {
    expect(filterOpenFloor(listings, 'low').map((g) => g.id)).toEqual(['open-low'])
    expect(filterOpenFloor(listings, 'mid').map((g) => g.id)).toEqual(['open-mid'])
    expect(filterOpenFloor(listings, 'high')).toEqual([])
  })

  it('stores DIRECT in lobby for My Games / Direct tabs but not on floor', () => {
    setActiveLobbyNetwork('local')
    upsertLobbyFromGame(base)
    upsertLobbyFromGame(direct)
    const open = listOpenGames('local')
    expect(open).toHaveLength(2)
    expect(filterOpenFloor(open, 'all')).toHaveLength(1)
    expect(filterOpenFloor(open, 'all')[0]?.access).toBe('OPEN')
    expect(open.find((g) => g.access === 'DIRECT')?.challengedPlayerId).toBe('bob')
  })
})
