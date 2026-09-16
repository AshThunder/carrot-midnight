import { useMemo, useState } from 'react'
import { Icon } from '@/components/game/SvgDefs'
import type { GameAccess } from '@/domain/game'

const PRESETS = [25, 50, 100, 250, 500] as const

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (access: GameAccess, wager: bigint, challenged?: string) => void
}

export function CreateChallengeModal({ open, onClose, onCreate }: Props) {
  const [wager, setWager] = useState('100')
  const [access, setAccess] = useState<GameAccess>('OPEN')
  const [challenged, setChallenged] = useState('')

  const wagerBig = useMemo(() => {
    const n = Number(wager)
    if (!Number.isFinite(n) || n < 1) return 1n
    return BigInt(Math.floor(n))
  }, [wager])

  const pot = wagerBig * 2n

  return (
    <section
      className={`modal${open ? ' show' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <button className="close-modal" type="button" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <div className="modal-icon">
        <Icon id="carrot" />
      </div>
      <div className="step-label">SET THE TABLE</div>
      <h2>CREATE A CHALLENGE</h2>
      <p className="modal-lead">Put your carrots where your mouth is.</p>
      <label className="field-label">YOUR WAGER</label>
      <div className="wager-input">
        <Icon id="carrot" />
        <input
          type="number"
          value={wager}
          min={1}
          onChange={(e) => setWager(e.target.value)}
        />
        <span>CARROTS</span>
      </div>
      <div className="quick-wagers">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            className={wager === String(p) ? 'active' : undefined}
            onClick={() => setWager(String(p))}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="match-type">
        <button
          type="button"
          className={access === 'OPEN' ? 'active' : undefined}
          onClick={() => setAccess('OPEN')}
        >
          <span>O</span>
          <b>OPEN</b>
          <small>Anyone can accept</small>
        </button>
        <button
          type="button"
          className={access === 'DIRECT' ? 'active' : undefined}
          onClick={() => setAccess('DIRECT')}
        >
          <span>D</span>
          <b>DIRECT</b>
          <small>Challenge a player</small>
        </button>
      </div>
      {access === 'DIRECT' && (
        <>
          <label className="field-label challenge-wallet-label">PLAYER ID</label>
          <div className="wallet-challenge-field">
            <input
              placeholder="mn_shield-addr_… or demo id"
              value={challenged}
              onChange={(e) => setChallenged(e.target.value)}
              autoComplete="off"
            />
          </div>
        </>
      )}
      <div className="fee-line">
        <span>Winner receives</span>
        <b>
          <Icon id="carrot" /> <span>{pot.toString()}</span>
        </b>
      </div>
      <button
        className="primary full"
        type="button"
        disabled={access === 'DIRECT' && !challenged.trim()}
        onClick={() => {
          onCreate(access, wagerBig, access === 'DIRECT' ? challenged.trim() : undefined)
          onClose()
        }}
      >
        CREATE CHALLENGE
      </button>
      <small className="fineprint">
        Minimum 1 carrot · Local demo sync · Winner receives the full pot
      </small>
    </section>
  )
}
