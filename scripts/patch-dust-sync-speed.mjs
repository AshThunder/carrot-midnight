#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const marker = 'preprod-dust-fast-batch'

function findFiles() {
  const out = []
  try {
    out.push(join(dirname(require.resolve('@midnight-ntwrk/wallet-sdk-dust-wallet/package.json')), 'dist/v1/Sync.js'))
  } catch { /* ignore */ }
  try {
    out.push(join(dirname(require.resolve('@midnightntwrk/wallet-sdk-dust-wallet/package.json')), 'dist/v1/Sync.js'))
  } catch { /* ignore */ }
  const walk = (dir, depth = 0) => {
    if (depth > 8 || !existsSync(dir)) return
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const full = join(dir, ent.name)
      if (ent.name === 'wallet-sdk-dust-wallet') out.push(join(full, 'dist/v1/Sync.js'))
      else if (ent.name.startsWith('@') || ent.name.includes('midnight') || ent.name === 'node_modules') walk(full, depth + 1)
    }
  }
  walk(join(projectRoot, 'node_modules'))
  return [...new Set(out)]
}

const old = `            const batchSize = config.batchUpdates?.size ?? 10;
            const batchTimeout = Duration.millis(config.batchUpdates?.timeout ?? 1);
            const batchSpacing = config.batchUpdates?.spacing ?? 4;`
const neu = `            // ${marker}: catch up ~1.5M preprod dust events faster
            const batchSize = config.batchUpdates?.size ?? 500;
            const batchTimeout = Duration.millis(config.batchUpdates?.timeout ?? 50);
            const batchSpacing = config.batchUpdates?.spacing ?? 0;`

let n = 0
for (const file of findFiles()) {
  if (!existsSync(file)) continue
  let text = readFileSync(file, 'utf8')
  if (text.includes(marker)) {
    console.log(`[patch-dust] already patched ${file}`)
    continue
  }
  if (!text.includes(old)) {
    console.log(`[patch-dust] pattern missing ${file}`)
    continue
  }
  writeFileSync(file, text.replace(old, neu))
  console.log(`[patch-dust] patched ${file}`)
  n++
}
console.log(`[patch-dust] done edits=${n}`)
