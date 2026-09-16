/** SHA-256 hex of a ciphertext string — mirrors Compact postChatCiphertext input. */
export async function hashCiphertext(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
