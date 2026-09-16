/** Local Undeployed endpoints — compose.yml / midnight-local-dev. */
export const LOCAL = {
  networkId: 'undeployed',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: '',
}

/** Genesis / Alice seed used by midnight-local-dev + example-hello-world (pre-funded on undeployed). */
export const GENESIS_SEED =
  '0000000000000000000000000000000000000000000000000000000000000001'

export async function probeLocalStack(timeoutMs = 8000) {
  const checks = [
    ['proof-server', `${LOCAL.proofServer}/health`],
    ['node', `${LOCAL.node}/health`],
    ['indexer', LOCAL.indexer],
  ]
  const out = {}
  for (const [name, url] of checks) {
    try {
      if (name === 'indexer') {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ block { height } }' }),
          signal: AbortSignal.timeout(timeoutMs),
        })
        const json = await res.json()
        out[name] = {
          ok: res.ok && !!json?.data?.block?.height,
          detail: json?.data?.block?.height
            ? `height ${json.data.block.height}`
            : JSON.stringify(json).slice(0, 120),
        }
      } else {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
        const text = await res.text()
        out[name] = { ok: res.ok, detail: text.slice(0, 160) }
      }
    } catch (e) {
      out[name] = { ok: false, detail: e.message }
    }
  }
  out.ready = !!(out['proof-server']?.ok && out.node?.ok && out.indexer?.ok)
  return out
}
