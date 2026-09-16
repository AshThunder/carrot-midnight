/**
 * Typed shapes mirroring @midnight-ntwrk/midnight-js-* provider contracts (4.1.1).
 * Real factories live in providers.ts; these interfaces keep UI/tests decoupled.
 */

/** Circuit ids emitted by carrot-game.compact (9 impure circuits). */
export type CarrotCircuitId =
  | 'createOpenGame'
  | 'createDirectChallenge'
  | 'acceptOpenGame'
  | 'acceptDirectChallenge'
  | 'cancelOpenGame'
  | 'submitDecision'
  | 'postChatCiphertext'
  | 'settle'
  | 'forfeitExpired'

export const CARROT_PRIVATE_STATE_ID = 'carrotPrivateState' as const
export type CarrotPrivateStateId = typeof CARROT_PRIVATE_STATE_ID

/** Private witnesses held off-ledger until settle. */
export type CarrotPrivateState = {
  localSecretKey: Uint8Array
  carrotLocation: 1 | 2
  carrotSalt: Uint8Array
}

export type NetworkId = 'undeployed' | 'preview' | 'preprod' | 'mainnet'

export interface WalletProviderLike {
  getCoinPublicKey(): string
  getEncryptionPublicKey(): string
  balanceTx(tx: unknown, ttl?: Date): Promise<unknown>
  transferTransaction?(...args: unknown[]): Promise<unknown>
}

export interface MidnightProviderLike {
  submitTx(tx: unknown): Promise<string>
}

export interface PublicDataProviderLike {
  queryContractState(address: string): Promise<unknown | null>
  watchContract?(address: string, cb: (state: unknown) => void): () => void
}

export interface ProofProviderLike {
  prove(circuitId: string, inputs: unknown): Promise<unknown>
}

export interface ZkConfigProviderLike {
  get(circuitId: string): Promise<unknown>
}

export interface PrivateStateProviderLike<S = CarrotPrivateState> {
  get(key: string): Promise<S | null>
  set(key: string, state: S): Promise<void>
  clear?(key: string): Promise<void>
}

/**
 * MidnightProviders-shaped bag used by deployContract / submitCallTx.
 * Built by tryBuildLiveProviders when stack + packages are ready.
 */
export interface CarrotProviders {
  privateStateProvider: PrivateStateProviderLike
  publicDataProvider: PublicDataProviderLike
  zkConfigProvider: ZkConfigProviderLike
  proofProvider: ProofProviderLike
  walletProvider: WalletProviderLike
  midnightProvider: MidnightProviderLike
}

export type DeployStatus = 'idle' | 'deploying' | 'deployed' | 'error'

export interface DeployedCarrotHandle {
  contractAddress: string
  /** Circuit callTx interface from DeployedContract (or stub). */
  callTx: Record<CarrotCircuitId, (...args: unknown[]) => Promise<{ txId: string }>>
}
