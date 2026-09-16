import { Icon } from '@/components/game/SvgDefs'
import { HingedBox } from '@/components/game/Box3d'
import type { NetworkKey } from '@/midnight/knownContracts'

type WelcomeScreenProps = {
  hidden: boolean
  networkLabel: string
  networkKey?: NetworkKey
  onNetworkChange?: (k: NetworkKey) => void
  soundOn: boolean
  onToggleSound: () => void
  onEnter: () => void
  onHowTo: () => void
  requirementsHint?: string
}

const NETWORKS: { key: NetworkKey; label: string }[] = [
  { key: 'local', label: 'LOCAL' },
  { key: 'preview', label: 'PREVIEW' },
  { key: 'preprod', label: 'PREPROD' },
]

export function WelcomeScreen({
  hidden,
  networkLabel,
  networkKey,
  onNetworkChange,
  soundOn,
  onToggleSound,
  onEnter,
  onHowTo,
  requirementsHint,
}: WelcomeScreenProps) {
  return (
    <section className={`welcome-screen${hidden ? ' hidden' : ''}`} id="welcome">
      <div className="welcome-grid" />
      <nav className="welcome-nav">
        <div className="brand static-brand">
          <span className="brand-mark">
            <Icon id="carrot" />
          </span>
          <span>
            CARROT
            <br />
            <b>MIDNIGHT</b>
          </span>
        </div>
        <div className="welcome-nav-actions">
          <div className="sound-control-group">
            <button
              className="sound-toggle"
              type="button"
              aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
              aria-pressed={soundOn}
              onClick={onToggleSound}
            >
              ♪ <span>SOUND {soundOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          {networkKey && onNetworkChange ? (
            <div className="conn-net-toggle welcome-net-toggle" role="group" aria-label="Midnight network">
              {NETWORKS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={networkKey === key ? 'active' : undefined}
                  aria-pressed={networkKey === key}
                  onClick={() => onNetworkChange(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="welcome-network">
              <i /> {networkLabel.toUpperCase()}
            </div>
          )}
        </div>
      </nav>
      <div className="welcome-content">
        <div className="welcome-copy">
          <div className="eyebrow">
            <span>●</span> THE PRIVATE BLUFFING GAME
          </div>
          <h1>
            TRUST
            <br />
            NO <em>BOX.</em>
          </h1>
          <p>One carrot. Two players. A sealed secret—and a very public lie.</p>
          <div className="welcome-actions">
            <button className="primary welcome-play" type="button" onClick={onEnter}>
              ENTER THE GAME
            </button>
            <button className="welcome-watch" type="button" onClick={onHowTo}>
              SEE HOW IT WORKS
            </button>
          </div>
          <div className="welcome-proof">
            <span>
              <Icon id="lock" />
              <b>ZERO-KNOWLEDGE</b>
              <small>Carrot stays private until selective disclosure</small>
            </span>
            <i />
            <span>
              <b>PLAYER VS PLAYER</b>
              <small>Bluff, swap and win the pot</small>
            </span>
          </div>
        </div>
        <div className="welcome-stage">
          <div className="welcome-rays" />
          <div className="welcome-player root-player">
            <div className="welcome-bubble">
              It&apos;s empty.
              <small>…probably.</small>
            </div>
            <Icon id="char-root" />
          </div>
          <div className="welcome-box box-one welcome-hinged">
            <HingedBox open={false} idle={!hidden} />
          </div>
          <div className="welcome-carrot">
            <Icon id="carrot" />
          </div>
          <div className="welcome-box box-two welcome-hinged">
            <HingedBox open={false} idle={!hidden} />
          </div>
          <div className="welcome-player leek-player">
            <div className="welcome-bubble">
              I don&apos;t
              <br />
              believe you.
            </div>
            <Icon id="char-leek" />
          </div>
        </div>
      </div>
      <div className="welcome-footer">
        <span>HOW IT WORKS</span>
        <b>OPTIONAL PEEK</b>
        <i>→</i>
        <b>BLUFF</b>
        <i>→</i>
        <b>KEEP OR SWAP</b>
        <i>→</i>
        <b>WIN THE CARROT</b>
      </div>
      {requirementsHint && (
        <p className="welcome-req-hint" style={{ textAlign: 'center', margin: '8px 16px 20px', fontSize: 12, opacity: 0.85 }}>
          {requirementsHint}
        </p>
      )}
    </section>
  )
}
