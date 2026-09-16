/**
 * Feature-detect local / preview Midnight stack endpoints.
 * Safe to call when Docker is down — returns explicit unreachable reasons.
 */

import { getConfig, type NetworkConfig } from './config'

export type EndpointHealth = {
  name: string
  url: string
  ok: boolean
  detail: string
  latencyMs?: number
}

export type StackHealth = {
  config: NetworkConfig
  proofServer: EndpointHealth
  indexer: EndpointHealth
  node: EndpointHealth
  /** True when proof server answers (required for httpClientProofProvider). */
  proofServerReady: boolean
  /** True when indexer GraphQL is reachable. */
  indexerReady: boolean
  /** True when node RPC answers. */
  nodeReady: boolean
  /** All three ready — deploy/call path unblocked from stack side. */
  stackReady: boolean
  disabledReasons: string[]
}

async function probeHttp(
  name: string,
  url: string,
  opts?: { method?: string; timeoutMs?: number; acceptStatuses?: number[] },
): Promise<EndpointHealth> {
  if (!url) {
    return { name, url: '', ok: false, detail: 'URL not configured' }
  }
  const timeoutMs = opts?.timeoutMs ?? 1500
  const method = opts?.method ?? 'GET'
  const accept = opts?.acceptStatuses ?? [200, 400, 404, 405]
  const started = Date.now()
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(url, { method, signal: ctrl.signal, mode: 'cors' }).finally(() =>
      clearTimeout(timer),
    )
    const latencyMs = Date.now() - started
    // Any HTTP response means the port is up (CORS may still block body)
    const ok = accept.includes(res.status) || res.status < 500
    return {
      name,
      url,
      ok,
      detail: ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
      latencyMs,
    }
  } catch (e) {
    const latencyMs = Date.now() - started
    const msg = e instanceof Error ? e.message : String(e)
    const aborted = msg.toLowerCase().includes('abort')
    return {
      name,
      url,
      ok: false,
      detail: aborted ? `timeout after ${timeoutMs}ms` : msg,
      latencyMs,
    }
  }
}

/** Probe proof-server / indexer / node for the active config. */
export async function probeStackHealth(
  config: NetworkConfig = getConfig(),
): Promise<StackHealth> {
  const [proofServer, indexer, node] = await Promise.all([
    probeHttp('proof-server', config.proofServer, {
      // proof server may not speak GET / — treat connection success broadly
      acceptStatuses: [200, 400, 404, 405, 422],
    }),
    probeHttp('indexer', config.indexer, {
      method: 'POST',
      acceptStatuses: [200, 400, 404, 405, 415, 422],
    }),
    probeHttp('node', `${config.node.replace(/\/$/, '')}/health`, {
      acceptStatuses: [200, 404],
    }).then(async (h) => {
      if (h.ok) return h
      // Fallback: bare node URL
      return probeHttp('node', config.node, { acceptStatuses: [200, 400, 404, 405] })
    }),
  ])

  const proofServerReady = proofServer.ok
  const indexerReady = indexer.ok
  const nodeReady = node.ok
  const stackReady = proofServerReady && indexerReady && nodeReady

  const disabledReasons: string[] = []
  if (!proofServerReady) {
    disabledReasons.push(
      config.proofServer
        ? `Proof server unreachable at ${config.proofServer} (${proofServer.detail})`
        : 'Proof server URL not configured for this network',
    )
  }
  if (!indexerReady) {
    disabledReasons.push(`Indexer unreachable at ${config.indexer} (${indexer.detail})`)
  }
  if (!nodeReady) {
    disabledReasons.push(`Node unreachable at ${config.node} (${node.detail})`)
  }
  if (config.networkId === 'undeployed' && !stackReady) {
    disabledReasons.push(
      'Local compose stack not running — install Docker/podman + newuidmap, then npm run env:up',
    )
  }

  return {
    config,
    proofServer,
    indexer,
    node,
    proofServerReady,
    indexerReady,
    nodeReady,
    stackReady,
    disabledReasons,
  }
}
