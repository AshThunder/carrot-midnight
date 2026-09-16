import { Icon } from '@/components/game/SvgDefs'
import type { NetworkKey } from '@/midnight/knownContracts'

export type LobbyTab = 'floor' | 'my' | 'direct' | 'leaders'

type TopbarProps = {
  networkPill: string
  networkKey: NetworkKey
  onNetworkChange: (k: NetworkKey) => void
  demoMode?: boolean
  activeTab: LobbyTab
  myCount: number
  directCount: number
  stash: number | null
  /** 'demo' = local offline stash; 'wallet' = live balance label */
  stashKind?: 'demo' | 'wallet' | null
  walletLabel: string
  soundOn: boolean
  onToggleSound: () => void
  onBrandClick: () => void
  onTab: (tab: LobbyTab) => void
  onWallet: () => void
}

const NETWORKS: { key: NetworkKey; label: string }[] = [
  { key: 'local', label: 'LOCAL' },
  { key: 'preview', label: 'PREVIEW' },
  { key: 'preprod', label: 'PREPROD' },
]

export function Topbar({
  networkPill,
  networkKey,
  onNetworkChange,
  demoMode,
  activeTab,
  myCount,
  directCount,
  stash,
  stashKind = null,
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
      <div className="topbar-net-cluster">
        <div className="season-pill" title={demoMode ? 'Local offline demo — switch to Preprod only with Lace/1AM connected' : undefined}>
          <i /> SEASON ZERO <span>{networkPill}</span>
        </div>
        <div className="conn-net-toggle topbar-net-toggle" role="group" aria-label="Midnight network">
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
          <div
            className={`balance balance-roomy${stashKind === 'demo' ? ' balance-demo' : ''}`}
            title={
              stashKind === 'demo'
                ? 'Demo stash (localStorage) — only shown on LOCAL / local-demo'
                : stashKind === 'wallet'
                  ? 'Wallet balance'
                  : undefined
            }
          >
            <Icon id="carrot" />
            <span>
              <small>{stashKind === 'demo' ? 'DEMO STASH' : stashKind === 'wallet' ? 'BALANCE' : 'YOUR STASH'}</small>
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
