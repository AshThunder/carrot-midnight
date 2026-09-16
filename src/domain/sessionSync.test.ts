import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllSyncedSessionsForTests,
  clearSyncedSession,
  findSessionByJoinCode,
  getTabSeat,
  loadSyncedSession,
  makeSyncedSession,
  saveSyncedSession,
  setTabSeat,
} from './sessionSync'
import type { GameRecord } from './game'
import { joinCodeFromGameId } from './invite'

const base: GameRecord = {
  id: 'local-sync-test-424242',
  access: 'OPEN',
  creatorId: 'alice',
  wager: 100n,
  phase: 'WAITING_FOR_OPPONENT',
  createdAt: 1,
  carrotCommitment: 'cm:x',
}

describe('sessionSync', () => {
  beforeEach(() => {
    clearAllSyncedSessionsForTests()
    clearSyncedSession(base.id)
  })

  it('persists and reloads a session with bigint wager', () => {
    const session = makeSyncedSession(base, { location: 1, salt: 'deadbeef' })
    saveSyncedSession(session)
    const loaded = loadSyncedSession(base.id)
    expect(loaded?.game.wager).toBe(100n)
    expect(loaded?.private?.location).toBe(1)
    expect(loaded?.joinCode).toBe(joinCodeFromGameId(base.id))
  })

  it('finds sessions by join code', () => {
    saveSyncedSession(makeSyncedSession(base))
    const code = joinCodeFromGameId(base.id)
    expect(findSessionByJoinCode(code)?.game.id).toBe(base.id)
    expect(findSessionByJoinCode('nope')).toBeNull()
  })

  it('stores per-tab seat (sessionStorage or memory fallback)', () => {
    setTabSeat(base.id, 'B')
    expect(getTabSeat(base.id)).toBe('B')
  })
})
