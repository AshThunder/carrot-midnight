/** Minimum decision window after acceptance (seconds). */
export const MIN_DECISION_WINDOW_SECONDS = 60 * 60

export type GameAccess = 'OPEN' | 'DIRECT'

export type GamePhase =
  | 'WAITING_FOR_OPPONENT'
  | 'WAITING_FOR_DECISION'
  | 'WAITING_FOR_REVEAL'
  | 'SETTLED'
  | 'CANCELLED'
  | 'FORFEITED'

export type CarrotLocation = 1 | 2

export type FinalChoice = 'KEEP' | 'SWAP'

export interface GameRecord {
  id: string
  access: GameAccess
  creatorId: string
  opponentId?: string
  challengedPlayerId?: string
  wager: bigint
  phase: GamePhase
  createdAt: number
  acceptedAt?: number
  decisionDeadline?: number
  /** Public commitment hex; location stays private until settle. */
  carrotCommitment?: string
  decision?: FinalChoice
  revealedLocation?: CarrotLocation
  winnerId?: string
  /** On-ledger chat ciphertext hash count (demo mirror). */
  chatCount?: number
  lastChatCipherHash?: string
}

export function isWaitingIndefinitely(game: GameRecord): boolean {
  return game.phase === 'WAITING_FOR_OPPONENT' && game.opponentId === undefined
}

export function decisionDeadlineFromAcceptance(
  acceptedAt: number,
  windowSeconds = MIN_DECISION_WINDOW_SECONDS,
): number {
  if (windowSeconds < MIN_DECISION_WINDOW_SECONDS) {
    throw new Error('Decision windows must be at least one hour')
  }
  return acceptedAt + windowSeconds * 1000
}

export function canCreatorCancel(game: GameRecord): boolean {
  return isWaitingIndefinitely(game)
}

export function canSubmitDecision(game: GameRecord): boolean {
  return game.phase === 'WAITING_FOR_DECISION' && !game.decision
}

export function canSettleReveal(game: GameRecord): boolean {
  return game.phase === 'WAITING_FOR_REVEAL' && !!game.decision
}

export function canPostChat(game: GameRecord): boolean {
  return game.phase === 'WAITING_FOR_DECISION' || game.phase === 'WAITING_FOR_REVEAL'
}

export function sampleCarrotLocation(random = Math.random): CarrotLocation {
  return random() < 0.5 ? 1 : 2
}

/** Shorten a pubkey/address string for UI badges. */
export function shortId(id: string, head = 6, tail = 4): string {
  if (id.length <= head + tail + 1) return id
  return `${id.slice(0, head)}…${id.slice(-tail)}`
}
