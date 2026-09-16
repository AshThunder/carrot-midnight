import type { CarrotLocation, FinalChoice } from './game'

export type StartingCarrotBox = 'PLAYER_A' | 'PLAYER_B'

/**
 * Pure winner logic mirrored by Compact `winnerIsCreator`.
 *
 * location 1 → carrot starts in Player A's box
 * location 2 → carrot starts in Player B's box
 * KEEP → starter with carrot wins
 * SWAP → the other player wins
 */
export function resolveWinnerRole(
  location: CarrotLocation,
  choice: FinalChoice,
): 'PLAYER_A' | 'PLAYER_B' {
  const creatorStartsWithCarrot = location === 1
  if (choice === 'KEEP') {
    return creatorStartsWithCarrot ? 'PLAYER_A' : 'PLAYER_B'
  }
  return creatorStartsWithCarrot ? 'PLAYER_B' : 'PLAYER_A'
}

export function resolveWinnerId(
  location: CarrotLocation,
  choice: FinalChoice,
  creatorId: string,
  opponentId: string,
): string {
  return resolveWinnerRole(location, choice) === 'PLAYER_A' ? creatorId : opponentId
}

export function startingBoxFromLocation(location: CarrotLocation): StartingCarrotBox {
  return location === 1 ? 'PLAYER_A' : 'PLAYER_B'
}

export function inferStartingCarrotBox(
  choice: FinalChoice | undefined,
  winnerId: string | undefined,
  creatorId: string,
  opponentId: string | undefined,
): StartingCarrotBox | undefined {
  if (!choice || !winnerId || !opponentId) return undefined
  const winnerIsCreator = winnerId === creatorId
  const winnerIsOpponent = winnerId === opponentId
  if (!winnerIsCreator && !winnerIsOpponent) return undefined
  const creatorStartedWithCarrot = choice === 'SWAP' ? winnerIsOpponent : winnerIsCreator
  return creatorStartedWithCarrot ? 'PLAYER_A' : 'PLAYER_B'
}
