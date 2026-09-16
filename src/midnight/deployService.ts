/**
 * Deploy / call service layer — gated by ConnectionSnapshot readiness.
 * When not ready, returns the same disabledReasons the Connection panel shows.
 */
import type { ConnectionSnapshot } from './connection'
import { getCompiledCarrotContract } from './compiledContract'
import {
  CARROT_PRIVATE_STATE_ID,
  createDeployedHandleStub,
  createProvidersStub,
  tryBuildLiveProviders,
  type ProviderConstructionPlan,
} from './providers'
import { createInitialPrivateState } from './witnesses'
import type {
  CarrotCircuitId,
  CarrotPrivateState,
  CarrotProviders,
  DeployedCarrotHandle,
  DeployStatus,
  WalletProviderLike,
} from './types'
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api'
import type { NetworkConfig } from './config'

export type DeployServiceState = {
  status: DeployStatus
  contractAddress?: string
  lastTxId?: string
  lastError?: string
  handle: DeployedCarrotHandle | null
  providersLive: boolean
}

export type DeployGateResult =
  | { ok: true }
  | { ok: false; disabledReasons: string[]; message: string }

export function gateDeployCall(snapshot: ConnectionSnapshot): DeployGateResult {
  if (snapshot.canDeploy && snapshot.canCall) return { ok: true }
  const disabledReasons = [...snapshot.disabledReasons]
  return {
    ok: false,
    disabledReasons,
    message: disabledReasons[0] ?? 'Deploy/call not ready',
  }
}

export function createIdleDeployState(): DeployServiceState {
  return {
    status: 'idle',
    handle: null,
    providersLive: false,
  }
}

export type DeployCarrotOpts = {
  snapshot: ConnectionSnapshot
  walletProvider?: WalletProviderLike
  connectedApi?: ConnectedAPI | null
  initialPrivateState?: CarrotPrivateState
  /** Injected providers for tests. */
  providers?: CarrotProviders
  plan?: ProviderConstructionPlan
}

export type DeployCarrotResult =
  | {
      ok: true
      contractAddress: string
      handle: DeployedCarrotHandle
      providers: CarrotProviders
      live: boolean
    }
  | {
      ok: false
      disabledReasons: string[]
      message: string
      handle: DeployedCarrotHandle
    }

/**
 * Deploy carrot-game when snapshot says ready; otherwise return disabled reasons + stub handle.
 */
export async function deployCarrotGame(opts: DeployCarrotOpts): Promise<DeployCarrotResult> {
  const gate = gateDeployCall(opts.snapshot)
  if (!gate.ok) {
    return {
      ok: false,
      disabledReasons: gate.disabledReasons,
      message: gate.message,
      handle: createDeployedHandleStub('carrot-midnight-undeployed', gate.disabledReasons),
    }
  }

  const config = opts.snapshot.network
  const built =
    opts.providers != null
      ? { providers: opts.providers, plan: opts.plan!, live: true }
      : await tryBuildLiveProviders({
          config,
          walletProvider: opts.walletProvider,
          connectedApi: opts.connectedApi,
        })

  if (!built.live) {
    const reasons = built.plan.blockers
    return {
      ok: false,
      disabledReasons: reasons,
      message: reasons[0] ?? 'Providers not live',
      handle: createDeployedHandleStub('carrot-midnight-undeployed', reasons),
    }
  }

  const privateState = opts.initialPrivateState ?? createInitialPrivateState()
  const compiledContract = await getCompiledCarrotContract()

  try {
    const { deployContract } = await import('@midnight-ntwrk/midnight-js-contracts')
    // midnight-js deploy API — cast keeps us resilient across compact-js shape tweaks
    const deployed = (await (deployContract as unknown as (
      p: unknown,
      o: unknown,
    ) => Promise<{
      deployTxData: { public: { contractAddress: string } }
      callTx: DeployedCarrotHandle['callTx']
    }>)(built.providers, {
      compiledContract,
      privateStateId: CARROT_PRIVATE_STATE_ID,
      initialPrivateState: privateState,
      args: [],
    }))

    const contractAddress = deployed.deployTxData.public.contractAddress
    const handle: DeployedCarrotHandle = {
      contractAddress,
      callTx: deployed.callTx,
    }
    return {
      ok: true,
      contractAddress,
      handle,
      providers: built.providers,
      live: true,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      disabledReasons: [msg],
      message: msg,
      handle: createDeployedHandleStub('carrot-midnight-undeployed', [msg]),
    }
  }
}

export type CallCircuitOpts = {
  snapshot: ConnectionSnapshot
  contractAddress: string
  circuitId: CarrotCircuitId
  args?: unknown[]
  providers?: CarrotProviders
  walletProvider?: WalletProviderLike
  connectedApi?: ConnectedAPI | null
  config?: NetworkConfig
}

export type CallCircuitResult =
  | { ok: true; txId: string; public?: unknown }
  | { ok: false; disabledReasons: string[]; message: string }

/**
 * submitCallTx wrapper — gated by canCall; otherwise surfaces disabledReasons.
 */
export async function callCarrotCircuit(opts: CallCircuitOpts): Promise<CallCircuitResult> {
  const gate = gateDeployCall(opts.snapshot)
  if (!gate.ok) {
    return {
      ok: false,
      disabledReasons: gate.disabledReasons,
      message: gate.message,
    }
  }

  const config = opts.config ?? opts.snapshot.network
  const built =
    opts.providers != null
      ? { providers: opts.providers, live: true, plan: null as ProviderConstructionPlan | null }
      : await tryBuildLiveProviders({
          config,
          walletProvider: opts.walletProvider,
          connectedApi: opts.connectedApi,
        })

  if (!built.live) {
    const reasons = built.plan?.blockers ?? ['Providers not live']
    return { ok: false, disabledReasons: reasons, message: reasons[0]! }
  }

  const compiledContract = await getCompiledCarrotContract()

  try {
    const { submitCallTx } = await import('@midnight-ntwrk/midnight-js-contracts')
    const result = await (submitCallTx as unknown as (
      p: unknown,
      o: unknown,
    ) => Promise<{ public: { txId?: string; txHash?: string } }>)(built.providers, {
      compiledContract,
      contractAddress: opts.contractAddress,
      privateStateId: CARROT_PRIVATE_STATE_ID,
      circuitId: opts.circuitId,
      args: opts.args ?? [],
    })

    const txId = result.public.txId ?? result.public.txHash ?? 'unknown-tx'
    return { ok: true, txId, public: result.public }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, disabledReasons: [msg], message: msg }
  }
}

/** Pure helper for UI: reasons to show under Deploy/Call buttons. */
export function deployCallDisabledCopy(snapshot: ConnectionSnapshot): string[] {
  const gate = gateDeployCall(snapshot)
  if (gate.ok) return []
  return gate.disabledReasons
}

/** Test helper — stub providers without network. */
export function providersForLocalTests(): CarrotProviders {
  return createProvidersStub()
}
