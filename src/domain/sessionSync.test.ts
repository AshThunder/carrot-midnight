import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllSyncedSessionsForTests,
  clearSyncedSession,
  findSessionByJoinCode,
  getTabSeat,
  loadSyncedSession,
  loadTabPrivate,
  makeSyncedSession,
  peekPublicSyncedWire,
  saveSyncedSession,
  saveTabPrivate,
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

  it('persists public session with bigint wager; tab private stays separate', () => {
    const session = makeSyncedSession(base, { location: 1, salt: 'deadbeef' })
    saveSyncedSession(session)

    const publicOnly = loadSyncedSession(base.id)
    expect(publicOnly?.game.wager).toBe(100n)
    expect(publicOnly?.private).toBeUndefined()
    expect(publicOnly?.joinCode).toBe(joinCodeFromGameId(base.id))

    const withPriv = loadSyncedSession(base.id, { includeTabPrivate: true })
    expect(withPriv?.private?.location).toBe(1)
    expect(withPriv?.private?.salt).toBe('deadbeef')
    expect(loadTabPrivate(base.id)?.location).toBe(1)
  })

  it('never writes carrot location/salt into the public sync wire', () => {
    saveSyncedSession(makeSyncedSession(base, { location: 2, salt: 'cafebabe' }))
    const wire = peekPublicSyncedWire(base.id)
    expect(wire).toBeTruthy()
    expect(wire).not.toHaveProperty('private')
    expect(JSON.stringify(wire)).not.toMatch(/cafebabe/)
    expect(JSON.stringify(wire)).not.toMatch(/"location"/)
  })

  it('finds sessions by join code without leaking private', () => {
    saveSyncedSession(makeSyncedSession(base, { location: 1, salt: 'secret' }))
    const code = joinCodeFromGameId(base.id)
    const found = findSessionByJoinCode(code)
    expect(found?.game.id).toBe(base.id)
    expect(found?.private).toBeUndefined()
    expect(findSessionByJoinCode('nope')).toBeNull()
  })

  it('stores per-tab seat (sessionStorage or memory fallback)', () => {
    setTabSeat(base.id, 'B')
    expect(getTabSeat(base.id)).toBe('B')
  })

  it('keeps tab private isolated — joiner path has no secrets unless saved locally', () => {
    saveSyncedSession(makeSyncedSession(base, { location: 1, salt: 'only-a' }))
    // Simulate another tab: clear memory privates by not calling saveTabPrivate,
    // public load has no private.
    const joinerView = loadSyncedSession(base.id)
    expect(joinerView?.private).toBeUndefined()
    // Explicit tab-private save (seat A) still works
    saveTabPrivate(base.id, { location: 1, salt: 'only-a' })
    expect(loadTabPrivate(base.id)?.salt).toBe('only-a')
  })
})
