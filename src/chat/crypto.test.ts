import { describe, expect, it } from 'vitest'
import { decryptMessage, deriveChatKey, encryptMessage } from './crypto'
import { hashCiphertext } from './hash'

describe('chat AES-GCM', () => {
  it('round-trips a bluff message', async () => {
    const key = await deriveChatKey('demo-shared-secret')
    const payload = await encryptMessage(key, 'the carrot is definitely in box 2')
    expect(payload).toContain('.')
    await expect(decryptMessage(key, payload)).resolves.toBe('the carrot is definitely in box 2')
  })

  it('rejects malformed ciphertext', async () => {
    const key = await deriveChatKey('demo-shared-secret')
    await expect(decryptMessage(key, 'not-a-payload')).rejects.toThrow()
  })

  it('hashes ciphertext stably for ledger posts', async () => {
    const a = await hashCiphertext('iv.ct')
    const b = await hashCiphertext('iv.ct')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('different room keys isolate plaintext', async () => {
    const k1 = await deriveChatKey('room-a')
    const k2 = await deriveChatKey('room-b')
    const payload = await encryptMessage(k1, 'secret bluff')
    await expect(decryptMessage(k2, payload)).rejects.toThrow()
  })
})
