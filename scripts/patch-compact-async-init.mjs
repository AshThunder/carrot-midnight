#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
let root
try {
  root = dirname(require.resolve('@midnight-ntwrk/compact-js/package.json'))
} catch {
  console.warn('[patch-compact] compact-js missing')
  process.exit(0)
}
const file = join(root, 'dist/esm/effect/ContractExecutable.js')
if (!existsSync(file)) {
  console.warn('[patch-compact] ContractExecutable.js missing')
  process.exit(0)
}
let text = readFileSync(file, 'utf8')
const marker = 'midnight-js 4.1.x Configuration still supplies hex strings'
if (text.includes(marker)) {
  console.log('[patch-compact] hex→tagged bridge already present')
  process.exit(0)
}
const old = `const asTaggedSigningKey = (signingKey, contractState) => SUPPORTED_CMA_SIGNATURE_KINDS.has(signingKey.tag)
    ? Either.right({ tag: signingKey.tag, value: signingKey.value })
    : Either.left(ContractConfigurationError.make(\`Unsupported signature scheme '\${signingKey.tag}' for a contract maintenance authority; \` +
        \`supported schemes are: \${[...SUPPORTED_CMA_SIGNATURE_KINDS].join(', ')}\`, contractState));`
if (!text.includes('SUPPORTED_CMA_SIGNATURE_KINDS.has(signingKey.tag)')) {
  console.log('[patch-compact] nothing to patch')
  process.exit(0)
}
const neu = `const asTaggedSigningKey = (signingKey, contractState) => {
    // midnight-js 4.1.x Configuration still supplies hex strings; compact-js 2.5.5+ expects tagged keys.
    if (typeof signingKey === 'string' || signingKey instanceof String) {
        return Either.right({ tag: 'schnorr', value: String(signingKey) });
    }
    if (signingKey && typeof signingKey === 'object' && typeof signingKey.value === 'string' && !signingKey.tag) {
        return Either.right({ tag: 'schnorr', value: signingKey.value });
    }
    return SUPPORTED_CMA_SIGNATURE_KINDS.has(signingKey?.tag)
        ? Either.right({ tag: signingKey.tag, value: signingKey.value })
        : Either.left(ContractConfigurationError.make(\`Unsupported signature scheme '\${signingKey?.tag}' for a contract maintenance authority; \` +
            \`supported schemes are: \${[...SUPPORTED_CMA_SIGNATURE_KINDS].join(', ')}\`, contractState));
};`
writeFileSync(file, text.replace(old, neu))
console.log('[patch-compact] applied')
