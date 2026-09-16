import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getConfig, type NetworkConfig } from '@/midnight/config'
import { buildConnectionSnapshot, type ConnectionSnapshot } from '@/midnight/connection'
import {
  planProviderConstruction,
  tryBuildLiveProviders,
  type ProviderConstructionPlan,
} from '@/midnight/providers'
import {
  callCarrotCircuit,
  createIdleDeployState,
  deployCarrotGame,
  deployCallDisabledCopy,
  type DeployServiceState,
} from '@/midnight/deployService'
import { createWalletStub, type MidnightWalletSession } from '@/midnight/walletStub'
import type { CarrotCircuitId, CarrotProviders } from '@/midnight/types'
import {
  defaultNetworkKey,
  knownContractForNetwork,
  PREPROD_DEPLOY_TX_ID,
  type NetworkKey,
} from '@/midnight/knownContracts'

export type { NetworkKey }

export function useMidnightConnection() {
  const walletRef = useRef<MidnightWalletSession | null>(null)
  if (!walletRef.current) walletRef.current = createWalletStub()
  const wallet = walletRef.current

  const [networkKey, setNetworkKey] = useState<NetworkKey>(() => defaultNetworkKey())
  const network: NetworkConfig = useMemo(() => getConfig(networkKey), [networkKey])

  const [, bump] = useState(0)
  const refreshWalletView = useCallback(() => bump((n) => n + 1), [])

  const [plan, setPlan] = useState<ProviderConstructionPlan | null>(null)
  const [providers, setProviders] = useState<CarrotProviders | null>(null)
  const [providersLive, setProvidersLive] = useState(false)
  const [probing, setProbing] = useState(false)
  const [errorNote, setErrorNote] = useState<string | null>(null)
  const [deployState, setDeployState] = useState<DeployServiceState>(() => createIdleDeployState())
  const [busyAction, setBusyAction] = useState<'deploy' | 'call' | null>(null)

  // Surface known Preprod (or env) contract address when switching networks
  useEffect(() => {
    const known = knownContractForNetwork(networkKey)
    setDeployState((s) => {
      if (known) {
        return {
          status: 'deployed',
          contractAddress: known,
          lastTxId: networkKey === 'preprod' ? (s.lastTxId ?? PREPROD_DEPLOY_TX_ID) : s.lastTxId,
          lastError: undefined,
          handle: s.handle,
          providersLive: s.providersLive,
        }
      }
      // Leaving a known-network: keep session deploy if we have a handle
      if (s.status === 'deployed' && s.handle) return s
      return createIdleDeployState()
    })
  }, [networkKey])

  const probe = useCallback(async () => {
    setProbing(true)
    try {
      const next = await planProviderConstruction(network)
      setPlan(next)
      const built = await tryBuildLiveProviders({
        config: network,
        walletProvider:
          wallet.status === 'connected' || wallet.status === 'local-demo'
            ? wallet.asWalletProvider()
            : undefined,
        connectedApi: wallet.connectedApi,
      })
      setProviders(built.providers)
      setProvidersLive(built.live)
      if (built.plan.mode !== next.mode) setPlan(built.plan)
    } finally {
      setProbing(false)
    }
  }, [network, wallet])

  useEffect(() => {
    void wallet.refreshInjection(5000).then(() => {
      refreshWalletView()
    })
  }, [wallet, refreshWalletView])

  useEffect(() => {
    void probe()
  }, [probe])

  const snapshot: ConnectionSnapshot = useMemo(
    () =>
      buildConnectionSnapshot({
        network,
        walletStatus: wallet.status,
        injectionStatus: wallet.injectionStatus,
        walletLabel: wallet.label,
        walletBrand: wallet.brand,
        walletAddress: wallet.address,
        isLocalDemo: wallet.isLocalDemo || wallet.status === 'local-demo',
        plan,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      network,
      plan,
      wallet.status,
      wallet.injectionStatus,
      wallet.label,
      wallet.address,
      wallet.isLocalDemo,
      wallet.brand,
    ],
  )

  const connect = useCallback(
    async (walletKey?: string) => {
      setErrorNote(null)
      try {
        await wallet.connect({ walletKey, networkId: network.networkId })
        refreshWalletView()
        await probe()
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setErrorNote(msg)
        refreshWalletView()
      }
    },
    [wallet, network.networkId, refreshWalletView, probe],
  )

  const disconnect = useCallback(() => {
    wallet.disconnect()
    setErrorNote(null)
    setDeployState(() => {
      const known = knownContractForNetwork(networkKey)
      if (known) {
        return {
          status: 'deployed',
          contractAddress: known,
          lastTxId: networkKey === 'preprod' ? PREPROD_DEPLOY_TX_ID : undefined,
          handle: null,
          providersLive: false,
        }
      }
      return createIdleDeployState()
    })
    refreshWalletView()
  }, [wallet, refreshWalletView, networkKey])

  const enableLocalDemo = useCallback(
    (address?: string) => {
      wallet.enableLocalDemo(address)
      setErrorNote(null)
      refreshWalletView()
    },
    [wallet, refreshWalletView],
  )

  const deploy = useCallback(async () => {
    setErrorNote(null)
    const reasons = deployCallDisabledCopy(snapshot)
    if (reasons.length > 0) {
      setErrorNote(reasons[0] ?? 'Deploy disabled')
      return
    }
    setBusyAction('deploy')
    setDeployState((s) => ({ ...s, status: 'deploying', lastError: undefined }))
    try {
      const result = await deployCarrotGame({
        snapshot,
        walletProvider: wallet.asWalletProvider(),
        connectedApi: wallet.connectedApi,
        providers: providersLive && providers ? providers : undefined,
        plan: plan ?? undefined,
      })
      if (!result.ok) {
        setDeployState({
          status: 'error',
          handle: result.handle,
          lastError: result.message,
          providersLive: false,
        })
        setErrorNote(result.message)
        return
      }
      setProviders(result.providers)
      setProvidersLive(result.live)
      setDeployState({
        status: 'deployed',
        contractAddress: result.contractAddress,
        handle: result.handle,
        providersLive: result.live,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setDeployState((s) => ({ ...s, status: 'error', lastError: msg }))
      setErrorNote(msg)
    } finally {
      setBusyAction(null)
    }
  }, [snapshot, wallet, providers, providersLive, plan])

  const callCircuit = useCallback(
    async (circuitId: CarrotCircuitId, args: unknown[] = []) => {
      setErrorNote(null)
      const reasons = deployCallDisabledCopy(snapshot)
      if (reasons.length > 0) {
        setErrorNote(reasons[0] ?? 'Call disabled')
        return
      }
      const address = deployState.contractAddress
      if (!address) {
        setErrorNote('Deploy a contract first')
        return
      }
      setBusyAction('call')
      try {
        const result = await callCarrotCircuit({
          snapshot,
          contractAddress: address,
          circuitId,
          args,
          providers: providersLive && providers ? providers : undefined,
          walletProvider: wallet.asWalletProvider(),
          connectedApi: wallet.connectedApi,
        })
        if (!result.ok) {
          setErrorNote(result.message)
          return
        }
        setDeployState((s) => ({ ...s, lastTxId: result.txId, lastError: undefined }))
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setErrorNote(msg)
      } finally {
        setBusyAction(null)
      }
    },
    [snapshot, deployState.contractAddress, providers, providersLive, wallet],
  )

  const knownContractAddress = knownContractForNetwork(networkKey)

  return {
    wallet,
    network,
    networkKey,
    setNetworkKey,
    snapshot,
    plan,
    probing,
    errorNote,
    connect,
    disconnect,
    enableLocalDemo,
    probe,
    refreshWalletView,
    providers,
    providersLive,
    deployState,
    busyAction,
    deploy,
    callCircuit,
    knownContractAddress,
  }
}
