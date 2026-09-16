import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum GamePhase { waitingForOpponent = 0,
                        waitingForDecision = 1,
                        revealing = 2,
                        settled = 3,
                        cancelled = 4,
                        forfeited = 5
}

export enum AccessMode { open = 0, direct = 1 }

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  carrotLocation(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  carrotSalt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  createOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        challenged_0: Uint8Array,
                        wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  cancelOpenGame(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  submitDecision(context: __compactRuntime.CircuitContext<PS>, doSwap_0: boolean): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postChatCiphertext(context: __compactRuntime.CircuitContext<PS>,
                     ctHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  forfeitExpired(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  createOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        challenged_0: Uint8Array,
                        wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  cancelOpenGame(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  submitDecision(context: __compactRuntime.CircuitContext<PS>, doSwap_0: boolean): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postChatCiphertext(context: __compactRuntime.CircuitContext<PS>,
                     ctHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  forfeitExpired(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array, seq_0: Uint8Array): Uint8Array;
  locationCommitment(loc_0: bigint, salt_0: Uint8Array): Uint8Array;
  winnerIsCreator(loc_0: bigint, didSwap_0: boolean): boolean;
}

export type Circuits<PS> = {
  publicKey(context: __compactRuntime.CircuitContext<PS>,
            sk_0: Uint8Array,
            seq_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  locationCommitment(context: __compactRuntime.CircuitContext<PS>,
                     loc_0: bigint,
                     salt_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, Uint8Array>>;
  winnerIsCreator(context: __compactRuntime.CircuitContext<PS>,
                  loc_0: bigint,
                  didSwap_0: boolean): Promise<__compactRuntime.CircuitResults<PS, boolean>>;
  createOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  createDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        challenged_0: Uint8Array,
                        wagerAmount_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptOpenGame(context: __compactRuntime.CircuitContext<PS>,
                 deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  acceptDirectChallenge(context: __compactRuntime.CircuitContext<PS>,
                        deadline_0: bigint): Promise<__compactRuntime.CircuitResults<PS, []>>;
  cancelOpenGame(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  submitDecision(context: __compactRuntime.CircuitContext<PS>, doSwap_0: boolean): Promise<__compactRuntime.CircuitResults<PS, []>>;
  postChatCiphertext(context: __compactRuntime.CircuitContext<PS>,
                     ctHash_0: Uint8Array): Promise<__compactRuntime.CircuitResults<PS, []>>;
  settle(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
  forfeitExpired(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly phase: GamePhase;
  readonly access: AccessMode;
  readonly creator: Uint8Array;
  readonly opponent: Uint8Array;
  readonly challengedPlayer: Uint8Array;
  readonly wager: bigint;
  readonly carrotCommitment: Uint8Array;
  readonly swapped: boolean;
  readonly decisionMade: boolean;
  readonly winner: Uint8Array;
  readonly revealedLocation: bigint;
  readonly decisionDeadline: bigint;
  readonly potSettled: boolean;
  readonly lastChatCipherHash: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
