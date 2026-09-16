/**
 * Client-side AES-GCM helpers for optional encrypted bluffing chat.
 * Ciphertexts can later be posted to a public store / Midnight private-state channel.
 * STUB-ready: fully implemented crypto; transport is stubbed in ChatPanel.
 */

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of u8) s += String.fromCharCode(b)
  return btoa(s)
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function deriveChatKey(sharedSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(sharedSecret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('carrot-midnight-chat-v1'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptMessage(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return `${toBase64(iv)}.${toBase64(ct)}`
}

export async function decryptMessage(key: CryptoKey, payload: string): Promise<string> {
  const [ivB64, ctB64] = payload.split('.')
  if (!ivB64 || !ctB64) throw new Error('Malformed ciphertext')
  const iv = fromBase64(ivB64)
  const ct = fromBase64(ctB64)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}
