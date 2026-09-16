/**
 * CompiledContract binding for carrot-game (midnight-js 4.1.x / compact-js).
 * ZK assets: browser serves /zk/carrot-game; Node uses contracts/managed path.
 *
 * Lazy dynamic import avoids pulling ledger WASM into the initial Vite chunk.
 */
import { Contract } from '../../contracts/managed/carrot-game/contract/index.js'
import { carrotWitnesses } from './witnesses'

export const ZK_BROWSER_ASSET_BASE = '/zk/carrot-game'

/** Relative path used by NodeZkConfigProvider / withCompiledFileAssets in Node. */
export const ZK_NODE_ASSET_REL = 'contracts/managed/carrot-game'

export function resolveZkAssetsPath(): string {
  if (typeof window !== 'undefined') return ZK_BROWSER_ASSET_BASE
  return ZK_NODE_ASSET_REL
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCompiled = any

let cached: AnyCompiled | null = null
let cachedPath: string | null = null
let building: Promise<AnyCompiled> | null = null

async function buildCompiled(assetsPath: string): Promise<AnyCompiled> {
  const mod = await import('@midnight-ntwrk/midnight-js-protocol/compact-js')
  const CompiledContract = mod.CompiledContract as unknown as {
    make: (tag: string, ctor: unknown) => AnyCompiled
    withWitnesses: (w: unknown) => (self: AnyCompiled) => AnyCompiled
    withCompiledFileAssets: (path: string) => (self: AnyCompiled) => AnyCompiled
  }
  return CompiledContract.make('CarrotGame', Contract).pipe(
    CompiledContract.withWitnesses(carrotWitnesses),
    CompiledContract.withCompiledFileAssets(assetsPath),
  )
}

/** Lazily build CompiledContract for the current environment. */
export async function getCompiledCarrotContract(
  assetsPath: string = resolveZkAssetsPath(),
): Promise<AnyCompiled> {
  if (cached && cachedPath === assetsPath) return cached
  if (!building) {
    building = buildCompiled(assetsPath).then((c) => {
      cached = c
      cachedPath = assetsPath
      building = null
      return c
    })
  }
  return building
}

export type CompiledCarrotContract = Awaited<ReturnType<typeof getCompiledCarrotContract>>
