import { describe, expect, it } from 'vitest'
import {
  canCreatorCancel,
  canPostChat,
  canSettleReveal,
  canSubmitDecision,
  decisionDeadlineFromAcceptance,
  isWaitingIndefinitely,
  sampleCarrotLocation,
  shortId,
  type GameRecord,
} from './game'

const openGame: GameRecord = {
  id: '1',
  access: 'OPEN',
  creatorId: 'creator',
  wager: 100n,
  phase: 'WAITING_FOR_OPPONENT',
  createdAt: 1_000,
}

describe('game lifecycle', () => {
  it('keeps an unaccepted open game waiting without a deadline', () => {
    expect(isWaitingIndefinitely(openGame)).toBe(true)
    expect(openGame.decisionDeadline).toBeUndefined()
    expect(canCreatorCancel(openGame)).toBe(true)
  })

  it('starts a one-hour-or-longer deadline after acceptance (ms)', () => {
    expect(decisionDeadlineFromAcceptance(1_000)).toBe(1_000 + 3_600_000)
    expect(() => decisionDeadlineFromAcceptance(1_000, 3_599)).toThrow()
  })

  it('samples location in {1,2}', () => {
    expect(sampleCarrotLocation(() => 0.1)).toBe(1)
    expect(sampleCarrotLocation(() => 0.9)).toBe(2)
  })

  it('gates decide → reveal → settle and chat', () => {
    const deciding: GameRecord = { ...openGame, phase: 'WAITING_FOR_DECISION', opponentId: 'b' }
    expect(canSubmitDecision(deciding)).toBe(true)
    expect(canPostChat(deciding)).toBe(true)
    expect(canSettleReveal(deciding)).toBe(false)

    const revealing: GameRecord = {
      ...deciding,
      phase: 'WAITING_FOR_REVEAL',
      decision: 'KEEP',
    }
    expect(canSubmitDecision(revealing)).toBe(false)
    expect(canSettleReveal(revealing)).toBe(true)
    expect(canPostChat(revealing)).toBe(true)
  })

  it('shortens ids for badges', () => {
    expect(shortId('abcdefghijklmnop', 4, 3)).toBe('abcd…nop')
    expect(shortId('short')).toBe('short')
  })
})

describe('revealing + terminal gates', () => {
  it('blocks settle without a locked decision', () => {
    const revealingNoDecision: GameRecord = {
      ...openGame,
      phase: 'WAITING_FOR_REVEAL',
      opponentId: 'b',
    }
    expect(canSettleReveal(revealingNoDecision)).toBe(false)
  })

  it('blocks chat outside decision/reveal windows', () => {
    expect(canPostChat(openGame)).toBe(false)
    expect(canPostChat({ ...openGame, phase: 'SETTLED' })).toBe(false)
    expect(canPostChat({ ...openGame, phase: 'FORFEITED' })).toBe(false)
    expect(canPostChat({ ...openGame, phase: 'CANCELLED' })).toBe(false)
  })

  it('blocks cancel once an opponent exists or phase advances', () => {
    expect(canCreatorCancel({ ...openGame, opponentId: 'b' })).toBe(false)
    expect(canCreatorCancel({ ...openGame, phase: 'WAITING_FOR_DECISION', opponentId: 'b' })).toBe(
      false,
    )
  })
})
