import { describe, expect, it } from 'vitest'
import { hashCiphertext } from './hash'
import { deriveChatKey, encryptMessage } from './crypto'

describe('ciphertext hash (ledger mirror)', () => {
  it('is deterministic SHA-256 hex (64 chars)', async () => {
    const a = await hashCiphertext('iv.ct')
    const b = await hashCiphertext('iv.ct')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes when ciphertext changes', async () => {
    const a = await hashCiphertext('iv.aaa')
    const b = await hashCiphertext('iv.bbb')
    expect(a).not.toBe(b)
  })

  it('hashes real AES-GCM payloads for postChatCiphertext shape', async () => {
    const key = await deriveChatKey('carrot-room:demo')
    const payload = await encryptMessage(key, 'box 1 for sure')
    const h = await hashCiphertext(payload)
    expect(h).toHaveLength(64)
    // empty / trivial inputs still produce full digests
    expect(await hashCiphertext('')).toHaveLength(64)
    expect(await hashCiphertext('')).not.toBe(h)
  })
})
