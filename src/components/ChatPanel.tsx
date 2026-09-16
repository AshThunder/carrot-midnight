import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/game/SvgDefs'
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
 * Renders with room-chat CSS classes from the premium game skin.
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
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [status, setStatus] = useState('Deriving room key…')
  const [openMobile, setOpenMobile] = useState(false)

  const keyPromise = useMemo(() => deriveChatKey(roomKey), [roomKey])

  useEffect(() => {
    let cancelled = false
    keyPromise
      .then(() => {
        if (!cancelled) {
          setStatus('Encrypted · shared room key ready')
          setMessages([
            {
              id: 'sys',
              from: 'system',
              plaintext: 'Bluff channel unlocked. Messages encrypt client-side.',
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
    <aside className={`room-chat${openMobile ? ' open' : ''}`}>
      <div
        className="chat-head"
        onClick={() => setOpenMobile((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setOpenMobile((v) => !v)
        }}
        role="button"
        tabIndex={0}
      >
        <div>
          <b>ENCRYPTED PLAYER CHAT</b>
          <small className="chat-status">{enabled ? status : 'LOCKED UNTIL ACCEPT'}</small>
        </div>
        <Icon id="lock" />
      </div>
      <div className="messages" id="messages">
        {messages.map((m) =>
          m.from === 'system' ? (
            <div key={m.id} className="system-message chat-system">
              {m.plaintext}
            </div>
          ) : (
            <div key={m.id} className="message">
              <div className={`chat-avatar ${m.from === 'A' ? 'root' : 'beet'}`}>
                <Icon id={m.from === 'A' ? 'char-root' : 'char-leek'} />
              </div>
              <div>
                <b>
                  PLAYER {m.from}
                  <small>encrypted</small>
                </b>
                <p>{m.plaintext}</p>
              </div>
            </div>
          ),
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input
          value={draft}
          disabled={!enabled || busy}
          placeholder={enabled ? 'Say something misleading…' : 'Chat unlocks after accept'}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Chat message"
        />
        <button type="submit" disabled={!enabled || !draft.trim() || busy} aria-label="Send">
          →
        </button>
      </form>
    </aside>
  )
}
