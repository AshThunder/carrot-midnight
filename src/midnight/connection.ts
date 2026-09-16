/**
 * Aggregated connection view for the Connection panel UI.
 */

import type { NetworkConfig } from './config'
import type { ProviderConstructionPlan } from './providersStub'
import type { WalletStatus } from './walletStub'
import type { InjectionStatus, WalletBrand } from './dappConnector'

export type ConnectionSnapshot = {
  network: NetworkConfig
  walletStatus: WalletStatus
  injectionStatus: InjectionStatus
  walletLabel: string
  walletBrand?: WalletBrand
  walletAddress?: string
  isLocalDemo: boolean
  plan: ProviderConstructionPlan | null
  /** Deploy / call disabled unless live providers + non-demo wallet. */
  canDeploy: boolean
  canCall: boolean
  /**
   * Legacy flag — offline lobby is only playable when network is Local.
   * Kept true for older callers; UI gates via playMode.canPerformGameplay.
   */
  localDemoPlayable: true
  disabledReasons: string[]
}

export function buildConnectionSnapshot(input: {
  network: NetworkConfig
  walletStatus: WalletStatus
  injectionStatus: InjectionStatus
  walletLabel: string
  walletBrand?: WalletBrand
  walletAddress?: string
  isLocalDemo: boolean
  plan: ProviderConstructionPlan | null
}): ConnectionSnapshot {
  const disabledReasons: string[] = []

  if (input.walletStatus !== 'connected') {
    if (input.isLocalDemo || input.walletStatus === 'local-demo') {
      disabledReasons.push('Local demo identity active — on-chain deploy/call disabled until Lace/1AM connect')
    } else if (input.walletStatus === 'unavailable' || input.injectionStatus === 'not-found') {
      disabledReasons.push(
        'No wallet extension — install Lace or 1AM (offline demo only on LOCAL network)',
      )
    } else if (input.walletStatus === 'disconnected') {
      disabledReasons.push('Wallet detected but not connected')
    } else if (input.walletStatus === 'connecting') {
      disabledReasons.push('Wallet connecting…')
    }
  }

  if (input.plan) {
    for (const b of input.plan.blockers) {
      if (!disabledReasons.includes(b)) disabledReasons.push(b)
    }
  } else {
    disabledReasons.push('Stack health not probed yet')
  }

  const stackOk = input.plan?.health.stackReady === true
  const packagesOk = input.plan?.packagesPresent === true
  const walletLive = input.walletStatus === 'connected' && !input.isLocalDemo

  const canDeploy = walletLive && stackOk && packagesOk
  const canCall = canDeploy

  return {
    network: input.network,
    walletStatus: input.walletStatus,
    injectionStatus: input.injectionStatus,
    walletLabel: input.walletLabel,
    walletBrand: input.walletBrand,
    walletAddress: input.walletAddress,
    isLocalDemo: input.isLocalDemo,
    plan: input.plan,
    canDeploy,
    canCall,
    localDemoPlayable: true,
    disabledReasons,
  }
}
