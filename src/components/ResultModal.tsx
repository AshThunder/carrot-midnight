import { Icon } from '@/components/game/SvgDefs'
import { shortId, type FinalChoice, type GamePhase } from '@/domain/game'

export type ResultModalProps = {
  open: boolean
  phase: Extract<GamePhase, 'SETTLED' | 'FORFEITED'>
  winnerId?: string
  creatorId: string
  opponentId?: string
  decision?: FinalChoice
  revealedLocation?: 1 | 2
  pot: string
  wager: string
  onClose: () => void
  onLobby?: () => void
  localRole?: 'A' | 'B'
}

export function ResultModal({
  open,
  phase,
  winnerId,
  creatorId,
  opponentId,
  decision,
  revealedLocation,
  pot,
  wager,
  onClose,
  onLobby,
  localRole = 'A',
}: ResultModalProps) {
  const youId = localRole === 'A' ? creatorId : opponentId
  const won = !!winnerId && winnerId === youId
  const isForfeit = phase === 'FORFEITED'

  if (won && !isForfeit) {
    return (
      <>
        <div className={`modal-backdrop${open ? ' show' : ''}`} onClick={onClose} aria-hidden />
        <section
          className={`win-popup${open ? ' show' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
        >
          <button className="close-modal result-close" type="button" aria-label="Close result" onClick={onClose}>
            ×
          </button>
          <div className="confetti confetti-a" />
          <div className="confetti confetti-b" />
          <div className="win-badge">🥕</div>
          <div className="eyebrow">TABLE SETTLED · MIDNIGHT ZK</div>
          <h2>
            YOU GOT THE
            <br />
            <em>CARROT!</em>
          </h2>
          <p className="win-copy">
            Selective disclosure opened the commitment. Choice {decision} · box {revealedLocation}.
          </p>
          <div className="payout">
            <small>YOU WON</small>
            <b>
              <Icon id="carrot" /> +{pot}
            </b>
            <span>FULL POT · WAGER {wager} EACH</span>
          </div>
          <div className="win-actions">
            <button className="primary" type="button" onClick={onLobby ?? onClose}>
              GAME FLOOR
            </button>
            <button className="secondary" type="button" onClick={onClose}>
              STAY
            </button>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <div className={`modal-backdrop${open ? ' show' : ''}`} onClick={onClose} aria-hidden />
      <section
        className={`result-popup defeat-popup${open ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <button className="close-modal result-close" type="button" aria-label="Close result" onClick={onClose}>
          ×
        </button>
        <div className="result-icon">{isForfeit ? '⏱' : '💥'}</div>
        <div className="eyebrow">{isForfeit ? 'TIMEOUT FORFEIT' : 'TABLE SETTLED'}</div>
        <h2>
          {isForfeit ? (
            <>
              THE CLOCK
              <br />
              <em>WON.</em>
            </>
          ) : (
            <>
              THE CARROT
              <br />
              <em>ESCAPED.</em>
            </>
          )}
        </h2>
        <p className="result-copy">
          {isForfeit
            ? `Decision window expired. Pot to ${shortId(winnerId ?? creatorId)}.`
            : `Winner ${shortId(winnerId ?? '')} · choice ${decision} · box ${revealedLocation}.`}
        </p>
        <div className="payout loss-payout">
          <small>{won ? 'YOU WON' : 'WAGER LOST'}</small>
          <b>
            {won ? '+' : '−'}
            {pot} 🥕
          </b>
          <span>{won ? 'FULL POT CLAIMED' : 'BETTER LUCK ON THE NEXT BLUFF'}</span>
        </div>
        <div className="win-actions">
          <button className="primary" type="button" onClick={onLobby ?? onClose}>
            GAME FLOOR
          </button>
          <button className="secondary" type="button" onClick={onClose}>
            STAY
          </button>
        </div>
      </section>
    </>
  )
}
