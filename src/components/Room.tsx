import { useEffect, useState } from 'react'
import { ChatPanel } from '@/components/ChatPanel'
import { ResultModal } from '@/components/ResultModal'
import { Icon } from '@/components/game/SvgDefs'
import { HingedBox } from '@/components/game/Box3d'
import type { useLocalGame } from '@/hooks/useLocalGame'
import { canCreatorCancel, canPostChat, canSettleReveal, shortId } from '@/domain/game'
import { potFromWager } from '@/domain/matchHistory'
import { flashUi } from '@/lib/uiFeedback'
import { useCountdown } from '@/hooks/useCountdown'

type LocalGameApi = ReturnType<typeof useLocalGame>

function phaseStep(phase: string): 'open' | 'decide' | 'reveal' {
  if (phase === 'WAITING_FOR_DECISION') return 'decide'
  if (
    phase === 'WAITING_FOR_REVEAL' ||
    phase === 'SETTLED' ||
    phase === 'FORFEITED' ||
    phase === 'CANCELLED'
  )
    return 'reveal'
  return 'open'
}

function phaseCopy(api: LocalGameApi): {
  tag: string
  title: string
  body: string
  speechYou: string
  speechRival: string
} {
  const game = api.game!
  switch (game.phase) {
    case 'WAITING_FOR_OPPONENT':
      return {
        tag: 'GAME OPEN',
        title: 'WAITING FOR A RIVAL',
        body:
          api.role === 'A'
            ? 'Share your invite or wait for someone to accept from the floor. You may peek privately anytime.'
            : 'Accept the challenge to lock wagers and start the decision clock.',
        speechYou: api.role === 'A' ? 'Come on in…' : 'Should I take the seat?',
        speechRival: '…',
      }
    case 'WAITING_FOR_DECISION':
      return {
        tag: 'PLAYER B DECIDES',
        title: api.role === 'B' ? 'KEEP OR SWAP?' : 'RIVAL IS THINKING',
        body:
          api.role === 'B'
            ? 'You cannot peek. Choose Keep Mine or Swap Boxes before the deadline.'
            : 'Bluff in chat. Player B must Keep or Swap before time runs out.',
        speechYou:
          api.role === 'A' ? (api.peeked ? 'I know something…' : 'No peek yet.') : 'Where is it?',
        speechRival: api.role === 'A' ? 'Hmm…' : 'Waiting on me.',
      }
    case 'WAITING_FOR_REVEAL':
      return {
        tag: 'REVEAL & SETTLE',
        title: `DECISION: ${game.decision}`,
        body: 'Commitment still sealed. Settle to selectively disclose the carrot and award the pot.',
        speechYou: 'Open the boxes!',
        speechRival: 'Moment of truth…',
      }
    case 'SETTLED':
      return {
        tag: 'TABLE SETTLED',
        title: 'CARROT REVEALED',
        body: `Winner ${shortId(game.winnerId ?? '')} · box ${game.revealedLocation} · ${game.decision}`,
        speechYou:
          game.winnerId === (api.role === 'A' ? game.creatorId : game.opponentId)
            ? 'Got it!'
            : 'Oof.',
        speechRival: '…',
      }
    case 'FORFEITED':
      return {
        tag: 'TIMEOUT',
        title: 'PLAYER A CLAIMS THE POT',
        body: 'Decision window expired. Commitment stays sealed.',
        speechYou: 'Clock ran out.',
        speechRival: 'Too slow.',
      }
    case 'CANCELLED':
      return {
        tag: 'CANCELLED',
        title: 'OPEN GAME CANCELLED',
        body: 'No pot transferred.',
        speechYou: 'Back to the floor.',
        speechRival: '…',
      }
    default:
      return {
        tag: 'TABLE',
        title: 'LOADING',
        body: api.notice,
        speechYou: '…',
        speechRival: '…',
      }
  }
}


function Box3D({
  yours,
  open,
  locked,
  hasCarrot,
  onClick,
  label,
}: {
  yours?: boolean
  open: boolean
  locked?: boolean
  hasCarrot?: boolean
  onClick?: () => void
  label: string
}) {
  return (
    <div className={`box-wrap${yours ? ' yours' : ''}`}>
      <span>{label}</span>
      <HingedBox
        open={open}
        locked={locked && !open}
        hasCarrot={open && !!hasCarrot}
        empty={open && !hasCarrot}
        asButton={!!onClick}
        onClick={onClick}
        id={yours ? 'peekBox' : 'rivalBox'}
      />
    </div>
  )
}

export function Room({
  api,
  playAllowed = true,
  playBlockedReason = null,
  onConnectWallet,
  offlineSimulation = false,
}: {
  api: LocalGameApi
  playAllowed?: boolean
  playBlockedReason?: string | null
  onConnectWallet?: () => void
  offlineSimulation?: boolean
}) {
  const game = api.game
  const [resultOpen, setResultOpen] = useState(false)
  const [theatre, setTheatre] = useState(false)

  const countdown = useCountdown(
    game?.phase === 'WAITING_FOR_DECISION' ? game.decisionDeadline : null,
  )

  useEffect(() => {
    if (!game) return
    if (game.phase === 'SETTLED' || game.phase === 'FORFEITED') {
      setResultOpen(true)
      flashUi(game.phase === 'SETTLED' ? 'settle' : 'warn')
    }
  }, [game?.phase, game?.id])

  useEffect(() => {
    document.body.classList.toggle('theatre-mode', theatre)
    return () => document.body.classList.remove('theatre-mode')
  }, [theatre])

  if (!game) return null

  const pot = potFromWager(game.wager)
  const step = phaseStep(game.phase)
  const copy = phaseCopy(api)
  const roomKey = `carrot-room:${game.id}:${game.carrotCommitment ?? 'x'}`

  const showCarrotA =
    (api.role === 'A' && api.peeked && api.privateLocation === 1) ||
    (game.phase === 'SETTLED' && game.revealedLocation === 1)
  const showCarrotB =
    (api.role === 'A' && api.peeked && api.privateLocation === 2) ||
    (game.phase === 'SETTLED' && game.revealedLocation === 2)

  const openA = api.boxStateA !== 'closed'
  const openB = api.boxStateB !== 'closed'
  const timerPct = countdown?.expired ? 0 : countdown ? Math.min(100, Math.max(8, 100)) : 100

  const rivalName =
    api.role === 'A'
      ? game.opponentId
        ? shortId(game.opponentId)
        : 'WAITING'
      : shortId(game.creatorId)

  return (
    <section id="game" className="screen game-screen active">
      <div className="game-hud">
        <div className="hud-left">
          <button className="back" type="button" onClick={() => api.leaveToLobby()}>
            ← LEAVE TABLE
          </button>
          <button className="theatre-button" type="button" onClick={() => setTheatre((v) => !v)}>
            ▣ THEATRE
          </button>
        </div>
        <div className="round-label">
          <small className="hud-room-access">TWO-PLAYER ROOM · {game.access}</small>
          <b className="hud-room-id">LOBBY {game.id.slice(0, 10)}</b>
        </div>
        <div className="pot">
          <small>PRIZE POT</small>
          <b>
            <Icon id="carrot" /> <span>{pot}</span>
          </b>
        </div>
      </div>

      {!playAllowed && (
        <div className="wallet-gate-banner room-wallet-gate" role="status">
          <div>
            <strong>WALLET REQUIRED</strong>
            <p>{playBlockedReason || 'Connect Lace or 1AM to continue this match.'}</p>
          </div>
          <button className="primary" type="button" onClick={() => onConnectWallet?.()}>
            CONNECT LACE / 1AM
          </button>
        </div>
      )}
      {playAllowed && offlineSimulation && (
        <div className="offline-sim-chip" role="status">
          Offline local demo — not an on-chain transaction
        </div>
      )}

      <div className="room-shell">
        <aside className="audience-rail" aria-label="Room tools">
          <div className="room-id">
            <span className="live-dot" />
            <div>
              <b>{shortId(game.id, 4, 4)}</b>
              <small>{api.role === 'A' ? 'PLAYER A' : 'PLAYER B'}</small>
            </div>
          </div>
          <div className="audience-seats">
            <button
              className="spectator"
              type="button"
              title="Act as Player A"
              onClick={() => {
                api.setRole('A')
                flashUi('tap')
              }}
            >
              <span className={`mini-face${api.role === 'A' ? '' : ' green'}`}>A</span>
              <span>A</span>
            </button>
            <button
              className="spectator"
              type="button"
              title="Act as Player B"
              onClick={() => {
                api.setRole('B')
                flashUi('tap')
              }}
            >
              <span className={`mini-face${api.role === 'B' ? '' : ' green'}`}>B</span>
              <span>B</span>
            </button>
          </div>
          <div className="room-invite-chip">
            <b>JOIN CODE</b>
            <span className="invite-code">{api.joinCode || shortId(game.id, 4, 4)}</span>
            <small>
              {offlineSimulation
                ? 'Offline multi-tab invite (same browser origin)'
                : 'Share link or code with your rival'}
            </small>
            <div className="room-invite-actions">
              {api.inviteUrl && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(api.inviteUrl!)
                    flashUi('ok')
                  }}
                >
                  COPY INVITE LINK
                </button>
              )}
              {api.joinCode && (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(api.joinCode!)
                    flashUi('ok')
                  }}
                >
                  COPY JOIN CODE
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className="arena">
          <div className="player-character player-you">
            <div className="speech" id="youSpeech">
              {copy.speechYou}
            </div>
            <Icon id="char-root" />
            <div className="nameplate">
              <b>YOU</b>
              <small>{api.role === 'A' ? 'PLAYER A' : 'PLAYER B'}</small>
              <em>{api.role === 'A' ? '1' : '2'}</em>
            </div>
          </div>
          <div className="player-character player-rival">
            <div className="speech rival-speech" id="rivalSpeech">
              {copy.speechRival}
            </div>
            <Icon id="char-leek" />
            <div className="nameplate">
              <b>{rivalName}</b>
              <small>{api.role === 'A' ? 'PLAYER B' : 'PLAYER A'}</small>
              <em>{api.role === 'A' ? '2' : '1'}</em>
            </div>
          </div>

          <div className="phase-track">
            <span data-phase-step="open" className={step === 'open' ? 'current' : undefined}>
              1 <b>GAME OPEN</b>
            </span>
            <i />
            <span data-phase-step="decide" className={step === 'decide' ? 'current' : undefined}>
              2 <b>B DECIDES</b>
            </span>
            <i />
            <span data-phase-step="reveal" className={step === 'reveal' ? 'current' : undefined}>
              3 <b>REVEAL &amp; SETTLE</b>
            </span>
          </div>

          <div className="arena-copy">
            <div className="phase-tag" id="phaseTag">
              {copy.tag}
            </div>
            <h2 id="phaseTitle">{copy.title}</h2>
            <p id="phaseCopy">{copy.body}</p>
          </div>

          <div className="table">
            <Box3D
              yours
              label="YOUR BOX"
              open={openA}
              hasCarrot={!!showCarrotA}
              onClick={
                playAllowed &&
                api.role === 'A' &&
                game.phase !== 'CANCELLED' &&
                game.phase !== 'SETTLED' &&
                game.phase !== 'FORFEITED'
                  ? () => {
                      api.peek()
                      flashUi('tap')
                    }
                  : undefined
              }
            />
            <div className="versus">VS</div>
            <Box3D label="RIVAL'S BOX" open={openB} locked={!openB} hasCarrot={!!showCarrotB} />
          </div>

          <div className="game-actions" id="gameActions">
            {game.phase === 'WAITING_FOR_OPPONENT' && (
              <>
                <button
                  className="primary"
                  type="button"
                  disabled={!playAllowed}
                  onClick={() => {
                    if (!playAllowed) {
                      onConnectWallet?.()
                      return
                    }
                    api.acceptGame()
                    flashUi('ok')
                  }}
                >
                  {playAllowed ? 'ACCEPT (AS PLAYER B)' : 'CONNECT TO ACCEPT'}
                </button>
                {canCreatorCancel(game) && (
                  <button
                    className="secondary"
                    type="button"
                    disabled={!playAllowed}
                    onClick={() => {
                      if (!playAllowed) {
                        onConnectWallet?.()
                        return
                      }
                      api.cancelGame()
                      flashUi('warn')
                    }}
                  >
                    CANCEL OPEN GAME
                  </button>
                )}
                <small>
                  <Icon id="lock" /> {api.joinCode ? `Join code ${api.joinCode}` : api.notice}
                </small>
              </>
            )}

            {game.phase === 'WAITING_FOR_DECISION' && api.role === 'B' && (
              <div className="decision-buttons">
                <button
                  className="primary"
                  type="button"
                  disabled={!playAllowed}
                  onClick={() => {
                    if (!playAllowed) {
                      onConnectWallet?.()
                      return
                    }
                    api.decide('KEEP')
                    flashUi('decide')
                  }}
                >
                  KEEP MINE
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={!playAllowed}
                  onClick={() => {
                    if (!playAllowed) {
                      onConnectWallet?.()
                      return
                    }
                    api.decide('SWAP')
                    flashUi('decide')
                  }}
                >
                  SWAP BOXES
                </button>
              </div>
            )}

            {game.phase === 'WAITING_FOR_DECISION' && (
              <button
                className="secondary"
                type="button"
                disabled={!playAllowed}
                onClick={() => {
                  if (!playAllowed) {
                    onConnectWallet?.()
                    return
                  }
                  api.forfeit()
                  flashUi('warn')
                }}
              >
                {api.role === 'A' ? 'CLAIM FORFEIT (TIMEOUT)' : 'SIMULATE TIMEOUT'}
              </button>
            )}

            {canSettleReveal(game) && (
              <button
                className="primary"
                type="button"
                disabled={!playAllowed}
                onClick={() => {
                  if (!playAllowed) {
                    onConnectWallet?.()
                    return
                  }
                  api.settle()
                  flashUi('settle')
                }}
              >
                {offlineSimulation ? 'SETTLE · OPEN BOXES (DEMO)' : 'SETTLE · OPEN BOXES'}
              </button>
            )}

            {(game.phase === 'SETTLED' || game.phase === 'FORFEITED') && (
              <button className="secondary" type="button" onClick={() => setResultOpen(true)}>
                REPLAY RESULT
              </button>
            )}

            {game.phase === 'WAITING_FOR_DECISION' && api.role === 'A' && (
              <small>Bluff in chat while Player B decides. Peek anytime on your box.</small>
            )}
            {api.role === 'A' &&
              game.phase !== 'CANCELLED' &&
              game.phase !== 'SETTLED' &&
              game.phase !== 'FORFEITED' &&
              !api.peeked && <small>Tap your box for a private peek (A only).</small>}
          </div>

          {game.phase === 'WAITING_FOR_DECISION' && (
            <div className="decision-countdown" id="decisionCountdown">
              <small>PLAYER B DECISION TIME</small>
              <b>{countdown?.label ?? '--:--'}</b>
            </div>
          )}
          <div className="timer">
            <span id="timerFill" style={{ width: `${timerPct}%` }} />
          </div>
        </div>

        <ChatPanel
          enabled={playAllowed && (canPostChat(game) || game.phase === 'SETTLED')}
          roomKey={roomKey}
          senderLabel={api.role === 'A' ? 'A' : 'B'}
          onCipherPosted={api.recordChatHash}
        />
      </div>

      {(game.phase === 'SETTLED' || game.phase === 'FORFEITED') && (
        <ResultModal
          open={resultOpen}
          phase={game.phase}
          winnerId={game.winnerId}
          creatorId={game.creatorId}
          opponentId={game.opponentId}
          decision={game.decision}
          revealedLocation={game.revealedLocation}
          pot={pot}
          wager={game.wager.toString()}
          onClose={() => setResultOpen(false)}
          onLobby={() => {
            setResultOpen(false)
            api.leaveToLobby()
          }}
          localRole={api.role}
        />
      )}
    </section>
  )
}
