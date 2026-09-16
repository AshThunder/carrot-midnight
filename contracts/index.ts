/**
 * Barrel for compiled Compact contract.
 * Run `npm run compile` before importing managed artifacts in Node/Midnight JS.
 *
 * Browser / DApp: use `getCompiledCarrotContract()` from `src/midnight/compiledContract.ts`
 * (CompiledContract + witnesses + ZK asset path).
 */
export {
  Contract,
  ledger,
  pureCircuits,
  GamePhase,
  AccessMode,
  type Ledger,
  type ImpureCircuits,
  type PureCircuits,
  type Witnesses,
} from './managed/carrot-game/contract/index.js'

import { fileURLToPath } from 'node:url'
import path from 'node:path'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const zkConfigPath = path.resolve(currentDir, 'managed', 'carrot-game')

/** Runtime stamp from managed compiler manifest — must match package.json compact-runtime. */
export const COMPACT_RUNTIME_STAMP = '0.19.0' as const
