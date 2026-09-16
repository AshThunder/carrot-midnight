import { Icon } from '@/components/game/SvgDefs'

export type LobbyTab = 'floor' | 'my' | 'direct' | 'leaders'

type TopbarProps = {
  networkPill: string
  activeTab: LobbyTab
  myCount: number
  directCount: number
  stash: number | null
  walletLabel: string
  walletTitle?: string
  soundOn: boolean
  onToggleSound: () => void
  onBrandClick: () => void
  onTab: (tab: LobbyTab) => void
  onWallet: () => void
  onSettings: () => void
  onHistory: () => void
}

export function Topbar({
  networkPill,
  activeTab,
  myCount,
  directCount,
  stash,
  walletLabel,
  walletTitle,
  soundOn,
  onToggleSound,
  onBrandClick,
  onTab,
  onWallet,
  onSettings,
  onHistory,
}: TopbarProps) {
  return (
    <header className="topbar">
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
      <nav className="desktop-nav">
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
      <div className="account-area">
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
          <div className="balance" title="Demo stash (localStorage)">
            <Icon id="carrot" />
            <span>
              <small>YOUR STASH</small>
              <b>{stash}</b>
            </span>
          </div>
        )}
        <button
          className="wallet"
          type="button"
          onClick={onWallet}
          title={walletTitle ?? walletLabel}
        >
          {walletLabel} <span />
        </button>
        <button
          className="header-icon settings-chip"
          type="button"
          aria-label="Open match history"
          title="History"
          onClick={onHistory}
        >
          ◷
        </button>
        <button
          className="header-icon settings-chip"
          type="button"
          aria-label="Open game settings"
          title="Settings"
          onClick={onSettings}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
