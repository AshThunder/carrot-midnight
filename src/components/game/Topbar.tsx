import { Icon } from '@/components/game/SvgDefs'

export type LobbyTab = 'floor' | 'my' | 'direct' | 'leaders'

type TopbarProps = {
  networkPill: string
  activeTab: LobbyTab
  myCount: number
  directCount: number
  stash: number | null
  walletLabel: string
  soundOn: boolean
  onToggleSound: () => void
  onBrandClick: () => void
  onTab: (tab: LobbyTab) => void
  onWallet: () => void
}

export function Topbar({
  networkPill,
  activeTab,
  myCount,
  directCount,
  stash,
  walletLabel,
  soundOn,
  onToggleSound,
  onBrandClick,
  onTab,
  onWallet,
}: TopbarProps) {
  return (
    <header className="topbar topbar-polish">
      <button className="brand" type="button" aria-label="Go to lobby" onClick={onBrandClick}>
        <span className="brand-mark">
          <Icon id="carrot" />
        </span>
        <span>
          CARROT
          <br />
          <b>MIDNIGHT</b>
        </span>
      </button>
      <div className="season-pill">
        <i /> SEASON ZERO <span>{networkPill}</span>
      </div>
      <nav className="desktop-nav" aria-label="Primary">
        <button
          type="button"
          className={activeTab === 'floor' ? 'active' : undefined}
          onClick={() => onTab('floor')}
        >
          GAME FLOOR
        </button>
        <button
          type="button"
          className={activeTab === 'my' ? 'active' : undefined}
          onClick={() => onTab('my')}
        >
          MY GAMES <b>{myCount}</b>
        </button>
        <button
          type="button"
          className={activeTab === 'direct' ? 'active' : undefined}
          onClick={() => onTab('direct')}
        >
          DIRECT <b>{directCount}</b>
        </button>
        <button
          type="button"
          className={activeTab === 'leaders' ? 'active' : undefined}
          onClick={() => onTab('leaders')}
        >
          LEADERBOARD
        </button>
      </nav>
      <div className="account-area account-area-roomy">
        <div className="sound-control-group compact-group">
          <button
            className="sound-toggle compact"
            type="button"
            aria-label={soundOn ? 'Mute sound' : 'Enable sound'}
            aria-pressed={soundOn}
            onClick={onToggleSound}
          >
            ♪
          </button>
        </div>
        {stash != null && (
          <div className="balance balance-roomy" title="Demo stash (localStorage)">
            <Icon id="carrot" />
            <span>
              <small>YOUR STASH</small>
              <b>{stash}</b>
            </span>
          </div>
        )}
        <button className="wallet wallet-roomy" type="button" onClick={onWallet}>
          <span className="wallet-label">{walletLabel}</span> <span className="wallet-dot" />
        </button>
      </div>
    </header>
  )
}
