import { describe, expect, it } from 'vitest'
import {
  buildInviteSearch,
  buildInviteUrl,
  joinCodeFromGameId,
  normalizeJoinCode,
  parseInviteFromSearch,
} from './invite'

describe('invite', () => {
  it('derives stable join codes from game ids', () => {
    expect(joinCodeFromGameId('local-1726451234567')).toBe('234567')
    expect(joinCodeFromGameId('abc')).toBe('XXXABC')
    expect(normalizeJoinCode('ab-12')).toBe('AB12')
  })

  it('parses ?game= and ?join= from search', () => {
    expect(parseInviteFromSearch('?game=local-1&join=abc123')).toEqual({
      gameId: 'local-1',
      joinCode: 'ABC123',
    })
    expect(parseInviteFromSearch('')).toEqual({ gameId: undefined, joinCode: undefined })
  })

  it('builds invite search and absolute urls', () => {
    const search = buildInviteSearch('local-99')
    expect(search).toContain('game=local-99')
    expect(search).toContain('join=')
    expect(buildInviteUrl('local-99', 'http://localhost:5173', '/')).toBe(
      `http://localhost:5173/${buildInviteSearch('local-99')}`,
    )
  })
})
