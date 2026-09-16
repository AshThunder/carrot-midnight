#!/usr/bin/env node
/**
 * Preprod indexer schema lag vs newer wallet-sdk:
 * - UnshieldedTransactionsProgress has only highestTransactionId (no protocolVersion)
 * - GraphQL query requesting protocolVersion → 400
 * - Effect Schema requiring protocolVersion → parse fail even after query strip
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const marker = 'preprod-indexer-no-progress-protocolVersion'
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function findRoots(packageDirName) {
  const roots = new Set()
  try {
    roots.add(dirname(require.resolve(`@midnightntwrk/${packageDirName}/package.json`)))
  } catch {
    /* ignore */
  }
  try {
    roots.add(dirname(require.resolve(`@midnight-ntwrk/${packageDirName}/package.json`)))
  } catch {
    /* ignore */
  }
  const walk = (dir, depth = 0) => {
    if (depth > 8 || !existsSync(dir)) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      if (!ent.isDirectory()) continue
      const full = join(dir, ent.name)
      if (ent.name === packageDirName) roots.add(full)
      else if (ent.name.startsWith('@') || ent.name.includes('midnight') || ent.name === 'node_modules') {
        walk(full, depth + 1)
      }
    }
  }
  walk(join(projectRoot, 'node_modules'))
  return [...roots]
}

function stripProgressProtocolVersion(text) {
  return text
    .replace(
      /(UnshieldedTransactionsProgress\s*\{[^}]*?\n\s*highestTransactionId)\s*\n\s*protocolVersion/g,
      '$1',
    )
    .replace(
      /(UnshieldedTransactionsProgress\s*\{[^}]*highestTransactionId)\s+protocolVersion/g,
      '$1',
    )
}

function stripAstNeedle(text) {
  const needle =
    'UnshieldedTransactionsProgress" } }, "selectionSet": { "kind": "SelectionSet", "selections": ' +
    '[{ "kind": "Field", "alias": { "kind": "Name", "value": "type" }, "name": { "kind": "Name", "value": "__typename" } }, ' +
    '{ "kind": "Field", "name": { "kind": "Name", "value": "highestTransactionId" } }, ' +
    '{ "kind": "Field", "name": { "kind": "Name", "value": "protocolVersion" } }]'
  const repl =
    'UnshieldedTransactionsProgress" } }, "selectionSet": { "kind": "SelectionSet", "selections": ' +
    '[{ "kind": "Field", "alias": { "kind": "Name", "value": "type" }, "name": { "kind": "Name", "value": "__typename" } }, ' +
    '{ "kind": "Field", "name": { "kind": "Name", "value": "highestTransactionId" } }]'
  return text.includes(needle) ? text.replace(needle, repl) : text
}

let total = 0

const indexerRoots = findRoots('wallet-sdk-indexer-client')
if (indexerRoots.length === 0) {
  console.warn('[patch-indexer] wallet-sdk-indexer-client not found')
} else {
  for (const root of indexerRoots) {
    console.log(`[patch-indexer] root=${root}`)
    for (const rel of [
      'dist/graphql/subscriptions/UnshieldedTransactions.js',
      'dist/graphql/generated/gql.js',
      'dist/graphql/generated/graphql.js',
    ]) {
      const file = join(root, rel)
      if (!existsSync(file)) continue
      let text = readFileSync(file, 'utf8')
      const before = text
      text = stripProgressProtocolVersion(text)
      if (rel.endsWith('graphql.js')) text = stripAstNeedle(text)
      if (text !== before) {
        if (!text.includes(marker)) text = `/* ${marker} */\n` + text
        writeFileSync(file, text)
        console.log(`[patch-indexer] patched ${rel}`)
        total++
      } else {
        console.log(`[patch-indexer] ok ${rel}`)
      }
    }
  }
}

for (const root of findRoots('wallet-sdk-unshielded-wallet')) {
  const file = join(root, 'dist/v1/SyncSchema.js')
  if (!existsSync(file)) continue
  let text = readFileSync(file, 'utf8')
  const before = text
  text = text.replace(
    /export const ProgressSchema = Schema\.Struct\(\{([\s\S]*?)protocolVersion:\s*Schema\.Number,/m,
    (m) =>
      m.replace(
        'protocolVersion: Schema.Number,',
        'protocolVersion: Schema.optionalWith(Schema.Number, { default: () => 0 }),',
      ),
  )
  if (text !== before) {
    writeFileSync(file, text)
    console.log(`[patch-indexer] patched ProgressSchema ${file}`)
    total++
  } else {
    console.log(`[patch-indexer] ProgressSchema already relaxed (${file})`)
  }
}

console.log(`[patch-indexer] done edits=${total}`)
