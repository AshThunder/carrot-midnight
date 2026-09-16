import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { decryptMessage, deriveChatKey, encryptMessage } from '@/chat/crypto'
import { hashCiphertext } from '@/chat/hash'

type ChatRow = {
  id: string
  from: string
  plaintext: string
  ciphertext: string
  cipherHash: string
  at: number
}

/**
 * Encrypted bluffing chat — AES-GCM with a shared room key (local demo).
 * Ciphertext hashes mirror Compact `postChatCiphertext` for future on-ledger posts.
 */
export function ChatPanel({
  enabled,
  roomKey,
  senderLabel = 'you',
  onCipherPosted,
}: {
  enabled: boolean
  roomKey: string
  senderLabel?: string
  onCipherPosted?: (cipherHash: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCipher, setShowCipher] = useState(false)
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [status, setStatus] = useState('Deriving room key…')

  const keyPromise = useMemo(() => deriveChatKey(roomKey), [roomKey])

  useEffect(() => {
    let cancelled = false
    keyPromise
      .then(() => {
        if (!cancelled) {
          setStatus('AES-GCM ready · shared room key (local demo)')
          setMessages([
            {
              id: 'sys',
              from: 'system',
              plaintext: 'Bluff channel unlocked. Messages encrypt client-side before display.',
              ciphertext: '',
              cipherHash: '',
              at: Date.now(),
            },
          ])
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('Key derivation failed')
      })
    return () => {
      cancelled = true
    }
  }, [keyPromise])

  const send = useCallback(async () => {
    const text = draft.trim()
    if (!enabled || !text || busy) return
    setBusy(true)
    try {
      const key = await keyPromise
      const ciphertext = await encryptMessage(key, text)
      const cipherHash = await hashCiphertext(ciphertext)
      // Round-trip decrypt to prove helpers end-to-end locally
      const roundTrip = await decryptMessage(key, ciphertext)
      if (roundTrip !== text) throw new Error('Decrypt mismatch')

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          from: senderLabel,
          plaintext: roundTrip,
          ciphertext,
          cipherHash,
          at: Date.now(),
        },
      ])
      onCipherPosted?.(cipherHash)
      setDraft('')
      setStatus(`Posted · hash ${cipherHash.slice(0, 10)}…`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Encrypt failed')
    } finally {
      setBusy(false)
    }
  }, [busy, draft, enabled, keyPromise, onCipherPosted, senderLabel])

  return (
    <Card className={!enabled ? 'opacity-60' : undefined}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Bluff channel</CardTitle>
        <div className="flex items-center gap-2">
          <Badge className="font-normal text-[10px]">{enabled ? 'live' : 'locked'}</Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!enabled}
            onClick={() => setShowCipher((v) => !v)}
          >
            {showCipher ? 'Hide CT' : 'Show CT'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">{status}</p>
        <div className="h-36 space-y-2 overflow-y-auto rounded-xl bg-midnight/60 p-3 text-sm">
          {messages.map((m) => (
            <div key={m.id} className="space-y-0.5">
              <p className="text-slate-300">
                <span className="font-semibold text-carrot">{m.from}: </span>
                {m.plaintext}
              </p>
              {showCipher && m.ciphertext && (
                <p className="break-all font-mono text-[10px] text-slate-500">
                  ct {m.ciphertext.slice(0, 48)}… · #{m.cipherHash.slice(0, 12)}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            disabled={!enabled || busy}
            placeholder={enabled ? 'Say something misleading…' : 'Chat unlocks after accept'}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void send()
            }}
          />
          <Button variant="secondary" disabled={!enabled || !draft.trim() || busy} onClick={() => void send()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
