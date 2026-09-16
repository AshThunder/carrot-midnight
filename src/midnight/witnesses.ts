/**
 * Compact witnesses for carrot-game — read private state, never disclose until settle.
 */
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime'
import type { Ledger } from '../../contracts/managed/carrot-game/contract/index.js'
import type { CarrotPrivateState } from './types'

export type CarrotWitnesses = {
  localSecretKey(
    context: WitnessContext<Ledger, CarrotPrivateState>,
  ): [CarrotPrivateState, Uint8Array]
  carrotLocation(
    context: WitnessContext<Ledger, CarrotPrivateState>,
  ): [CarrotPrivateState, bigint]
  carrotSalt(
    context: WitnessContext<Ledger, CarrotPrivateState>,
  ): [CarrotPrivateState, Uint8Array]
}

export const carrotWitnesses: CarrotWitnesses = {
  localSecretKey({ privateState }) {
    return [privateState, privateState.localSecretKey]
  },
  carrotLocation({ privateState }) {
    return [privateState, BigInt(privateState.carrotLocation)]
  },
  carrotSalt({ privateState }) {
    return [privateState, privateState.carrotSalt]
  },
}

/** Fresh private state for a creator (random secret + location + salt). */
export function createInitialPrivateState(
  randomBytes: (n: number) => Uint8Array = defaultRandomBytes,
): CarrotPrivateState {
  const locByte = randomBytes(1)[0]!
  return {
    localSecretKey: randomBytes(32),
    carrotLocation: (locByte % 2 === 0 ? 1 : 2) as 1 | 2,
    carrotSalt: randomBytes(32),
  }
}

function defaultRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out)
    return out
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256)
  return out
}
