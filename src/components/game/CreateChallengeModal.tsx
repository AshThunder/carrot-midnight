import { useMemo, useState } from 'react'
import { Icon } from '@/components/game/SvgDefs'
import { ModalPortal } from '@/components/ModalPortal'
import type { GameAccess } from '@/domain/game'

const PRESETS = [25, 50, 100, 250, 500] as const

type Props = {
  open: boolean
  onClose: () => void
  onCreate: (access: GameAccess, wager: bigint, challenged?: string) => void
  playAllowed?: boolean
  offlineSimulation?: boolean
}

export function CreateChallengeModal({
  open,
  onClose,
  onCreate,
  playAllowed = true,
  offlineSimulation = false,
}: Props) {
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
    <ModalPortal>
      <div
        className={`modal-backdrop${open ? ' show' : ''}`}
        onClick={onClose}
        aria-hidden
        data-overlay="create-challenge"
      />
      <section
        className={`modal${open ? ' show' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        data-modal="create-challenge"
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
          disabled={!playAllowed || (access === 'DIRECT' && !challenged.trim())}
          onClick={() => {
            if (!playAllowed) return
            onCreate(access, wagerBig, access === 'DIRECT' ? challenged.trim() : undefined)
            onClose()
          }}
        >
          {playAllowed ? 'CREATE CHALLENGE' : 'CONNECT WALLET FIRST'}
        </button>
        <small className="fineprint">
          {offlineSimulation
            ? 'Minimum 1 carrot · Offline local lobby sync · Not an on-chain transaction'
            : playAllowed
              ? 'Minimum 1 carrot · Winner receives the full pot · Wallet connected'
              : 'Connect Lace or 1AM on Preprod/Preview before creating'}
        </small>
      </section>
    </ModalPortal>
  )
}
