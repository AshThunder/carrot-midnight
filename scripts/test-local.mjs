#!/usr/bin/env node
/**
 * Local Undeployed gate: probe stack → domain vitest → deploy+smoke when daemon is up.
 *
 *   npm run test:local
 *
 * If Docker is down, exits non-zero with Mac-side instructions (WaveHack primary path).
 */
import { spawnSync } from 'node:child_process'
import { probeLocalStack } from './local-env.mjs'

const health = await probeLocalStack()
console.log('[test:local] Stack probe:', health.ready ? 'READY' : 'DOWN')
console.log(JSON.stringify(health, null, 2))

console.log('[test:local] Running domain/unit vitest…')
const unit = spawnSync('npm', ['test'], { stdio: 'inherit', shell: false })
if (unit.status !== 0) process.exit(unit.status ?? 1)

if (!health.ready) {
  console.error('')
  console.error('[test:local] Local Undeployed stack is DOWN — WaveHack primary path needs Docker.')
  console.error('Mac / Docker Desktop:')
  console.error('  1. Open Docker Desktop until engine is running')
  console.error('  2. cd carrot-midnight && npm run env:up')
  console.error('  3. npm run test:local   # re-run → deploy:local smoke')
  console.error('  Or: git clone https://github.com/midnightntwrk/midnight-local-dev && npm start')
  console.error('')
  process.exit(2)
}

console.log('[test:local] Stack up — running deploy:local…')
const deploy = spawnSync('node', ['scripts/deploy-local.mjs'], { stdio: 'inherit', shell: false })
process.exit(deploy.status ?? 1)
