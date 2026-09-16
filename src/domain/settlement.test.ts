import { describe, expect, it } from 'vitest'
import {
  inferStartingCarrotBox,
  resolveWinnerId,
  resolveWinnerRole,
  startingBoxFromLocation,
} from './settlement'

const creator = 'alice'
const opponent = 'bob'

describe('settlement winner math', () => {
  it('KEEP awards the player who started with the carrot', () => {
    expect(resolveWinnerRole(1, 'KEEP')).toBe('PLAYER_A')
    expect(resolveWinnerRole(2, 'KEEP')).toBe('PLAYER_B')
    expect(resolveWinnerId(1, 'KEEP', creator, opponent)).toBe(creator)
    expect(resolveWinnerId(2, 'KEEP', creator, opponent)).toBe(opponent)
  })

  it('SWAP awards the other player', () => {
    expect(resolveWinnerRole(1, 'SWAP')).toBe('PLAYER_B')
    expect(resolveWinnerRole(2, 'SWAP')).toBe('PLAYER_A')
    expect(resolveWinnerId(1, 'SWAP', creator, opponent)).toBe(opponent)
    expect(resolveWinnerId(2, 'SWAP', creator, opponent)).toBe(creator)
  })

  it('maps location to starting box', () => {
    expect(startingBoxFromLocation(1)).toBe('PLAYER_A')
    expect(startingBoxFromLocation(2)).toBe('PLAYER_B')
  })

  it('derives original box from keep/swap + winner', () => {
    expect(inferStartingCarrotBox('KEEP', creator, creator, opponent)).toBe('PLAYER_A')
    expect(inferStartingCarrotBox('KEEP', opponent, creator, opponent)).toBe('PLAYER_B')
    expect(inferStartingCarrotBox('SWAP', opponent, creator, opponent)).toBe('PLAYER_A')
    expect(inferStartingCarrotBox('SWAP', creator, creator, opponent)).toBe('PLAYER_B')
  })

  it('does not invent a revealed box for timeout results', () => {
    expect(inferStartingCarrotBox(undefined, creator, creator, opponent)).toBeUndefined()
  })
})

describe('revealing narrative (KEEP/SWAP × location)', () => {
  it('covers all four settle outcomes', () => {
    const cases: Array<[1 | 2, 'KEEP' | 'SWAP', 'PLAYER_A' | 'PLAYER_B']> = [
      [1, 'KEEP', 'PLAYER_A'],
      [1, 'SWAP', 'PLAYER_B'],
      [2, 'KEEP', 'PLAYER_B'],
      [2, 'SWAP', 'PLAYER_A'],
    ]
    for (const [loc, choice, role] of cases) {
      expect(resolveWinnerRole(loc, choice)).toBe(role)
      expect(resolveWinnerId(loc, choice, creator, opponent)).toBe(
        role === 'PLAYER_A' ? creator : opponent,
      )
    }
  })
})
