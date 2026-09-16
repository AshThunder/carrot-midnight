import { useMemo, useState } from 'react'
import { Icon } from '@/components/game/SvgDefs'
import { HingedBox } from '@/components/game/Box3d'
import type { LobbyTab } from '@/components/game/Topbar'
import { CreateChallengeModal } from '@/components/game/CreateChallengeModal'
import { RulesModal } from '@/components/game/RulesModal'
import type { GameAccess } from '@/domain/game'
import { shortId } from '@/domain/game'
import type { LobbyListing } from '@/domain/lobbyStore'
import { buildLeaderboard, listMatchHistory, type MatchHistoryEntry } from '@/domain/matchHistory'

const AVATAR_COLORS = ['orange', 'pink', 'green', 'blue'] as const

function ageLabel(createdAt: number): string {
  const mins = Math.max(0, Math.floor((Date.now() - createdAt) / 60000))
  if (mins < 1) return 'JUST NOW'
  if (mins < 60) return `${mins}M AGO`
  const hrs = Math.floor(mins / 60)
  return `${hrs}H AGO`
}

function initials(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '')
  return (clean.slice(0, 2) || '??').toUpperCase()
}

interface LobbyProps {
  active: boolean
  activeTab: LobbyTab
  onTab: (tab: LobbyTab) => void
  onCreate: (access: GameAccess, wager: bigint, challenged?: string) => void
  onJoinListing: (listing: LobbyListing) => void
  onJoinByCode: (code: string) => boolean
  openListings: LobbyListing[]
  onRefreshListings: () => void
  localAddress: string
  historyTick: number
  notice?: string
  networkLabel: string
  /** False on Preprod/Preview until Lace/1AM is connected. */
  playAllowed?: boolean
  playBlockedReason?: string | null
  onConnectWallet?: () => void
  offlineSimulation?: boolean
}

export function Lobby({
  active,
  activeTab,
  onTab,
  onCreate,
  onJoinListing,
  onJoinByCode,
  openListings,
  onRefreshListings,
  localAddress,
  historyTick,
  notice,
  networkLabel,
  playAllowed = true,
  playBlockedReason = null,
  onConnectWallet,
  offlineSimulation = false,
}: LobbyProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [stakeFilter, setStakeFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all')

  const history = useMemo(() => {
    void historyTick
    return listMatchHistory()
  }, [historyTick])

  const leaders = useMemo(() => buildLeaderboard(history), [history])

  const myGames = useMemo(() => {
    const openMine = openListings.filter(
      (g) => g.creatorId === localAddress || g.challengedPlayerId === localAddress,
    )
    const past = history.filter(
      (h) => h.creatorId === localAddress || h.opponentId === localAddress,
    )
    return { openMine, past }
  }, [openListings, history, localAddress])

  const directGames = useMemo(
    () =>
      openListings.filter(
        (g) =>
          g.access === 'DIRECT' &&
          (g.challengedPlayerId === localAddress || g.creatorId === localAddress),
      ),
    [openListings, localAddress],
  )

  const filteredFloor = useMemo(() => {
    return openListings.filter((g) => {
      if (g.access === 'DIRECT' && g.challengedPlayerId && g.challengedPlayerId !== localAddress) {
        return false
      }
      const w = Number(g.wager)
      if (stakeFilter === 'low') return w <= 50
      if (stakeFilter === 'mid') return w > 50 && w <= 250
      if (stakeFilter === 'high') return w > 250
      return true
    })
  }, [openListings, stakeFilter, localAddress])

  const settledPrizes = useMemo(
    () => history.filter((h) => h.phase === 'SETTLED').length,
    [history],
  )

  const showFloor = activeTab === 'floor' || activeTab === 'leaders'
  const showMy = activeTab === 'my'
  const showDirect = activeTab === 'direct'
  const showLeadersAside = activeTab === 'floor' || activeTab === 'leaders'

  return (
    <>
      <section id="lobby" className={`screen${active ? ' active' : ''}`}>
        <div className="lobby-hero">
          <div>
            <div className="eyebrow">
              <span>●</span> LIVE GAME FLOOR
            </div>
            <h1>
              READ THE BLUFF.
              <br />
              <em>MAKE THE CALL.</em>
            </h1>
            <p>One carrot. Two boxes. Zero trust. Private until you disclose.</p>
          </div>
          <div className="hero-boxes" aria-hidden="true">
            <div className="stage-rays" />
            <div className="game-box left hero-hinged">
              <HingedBox open={false} idle />
            </div>
            <div className="hero-carrot">
              <Icon id="carrot" />
            </div>
            <div className="game-box right hero-hinged">
              <HingedBox open={false} idle />
            </div>
          </div>
        </div>

        {!playAllowed && (
          <div className="wallet-gate-banner" role="status">
            <div>
              <strong>WALLET REQUIRED</strong>
              <p>{playBlockedReason || 'Connect Lace or 1AM to play on this network.'}</p>
              <p className="wallet-gate-hints">
                Install Lace/1AM · set wallet to {networkLabel} · proof server{' '}
                <span className="mono">:6300</span> · Preprod faucet if needed. Or switch network to{' '}
                <b>LOCAL</b> for offline demo.
              </p>
            </div>
            <button className="primary" type="button" onClick={() => onConnectWallet?.()}>
              CONNECT LACE / 1AM
            </button>
          </div>
        )}

        <div className="action-strip">
          <button
            className="primary big"
            type="button"
            disabled={!playAllowed}
            title={!playAllowed ? (playBlockedReason ?? 'Connect wallet first') : undefined}
            onClick={() => {
              if (!playAllowed) {
                onConnectWallet?.()
                return
              }
              setCreateOpen(true)
            }}
          >
            <span className="button-icon">⚔</span>
            <span>
              CREATE A CHALLENGE
              <small>
                {playAllowed
                  ? offlineSimulation
                    ? 'Offline demo · local lobby'
                    : 'Set your wager & wait for a rival'
                  : 'Connect wallet to create'}
              </small>
            </span>
          </button>
          <button className="secondary big" type="button" onClick={() => setRulesOpen(true)}>
            <span className="button-icon">?</span>
            <span>
              HOW TO PLAY
              <small>Learn the bluff before you play</small>
            </span>
          </button>
          <div className="floor-stats" aria-label="Live game totals">
            <span>
              <b>{networkLabel}</b>
              <small>NETWORK</small>
            </span>
            <i />
            <span>
              <b>{openListings.length}</b>
              <small>OPEN GAMES</small>
            </span>
            <i />
            <span>
              <b>{settledPrizes}</b>
              <small>SETTLED PRIZES</small>
            </span>
          </div>
        </div>

        <nav className="lobby-tabs">
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
            MY GAMES <b>{myGames.openMine.length + myGames.past.length}</b>
          </button>
          <button
            type="button"
            className={activeTab === 'direct' ? 'active' : undefined}
            onClick={() => onTab('direct')}
          >
            DIRECT CHALLENGES <b>{directGames.length}</b>
          </button>
          <button
            type="button"
            className={activeTab === 'leaders' ? 'active' : undefined}
            onClick={() => onTab('leaders')}
          >
            LEADERBOARD
          </button>
        </nav>

        {notice && (
          <div className="activity-ticker">
            <span className="ticker-live">STATUS</span>
            <div>{notice}</div>
            <button type="button" onClick={onRefreshListings} aria-label="Refresh">
              →
            </button>
          </div>
        )}

        <section
          className={`direct-inbox panel lobby-section${showDirect ? '' : ' is-hidden'}`}
          data-lobby-section="direct"
        >
          <div className="panel-head">
            <div>
              <h2>
                DIRECT CHALLENGES <span className="inbox-count">{directGames.length}</span>
              </h2>
              <p>Players have called you out personally — or you challenged them.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="JOIN CODE"
                style={{
                  background: '#150c23',
                  border: '1px solid #452850',
                  borderRadius: 8,
                  color: '#fff',
                  padding: '8px 10px',
                  fontSize: 12,
                  width: 110,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                }}
                aria-label="Join code"
              />
              <button
                className="text-button"
                type="button"
                disabled={!playAllowed || !joinCode.trim()}
                title={!playAllowed ? (playBlockedReason ?? 'Connect wallet first') : undefined}
                onClick={() => {
                  if (!playAllowed) {
                    onConnectWallet?.()
                    return
                  }
                  if (onJoinByCode(joinCode.trim())) setJoinCode('')
                }}
              >
                JOIN BY CODE
              </button>
            </div>
          </div>
          <div className="direct-challenge-list">
            {directGames.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <strong>NO DIRECT CHALLENGES</strong>
                <p>Create a direct game or paste a join code above.</p>
              </div>
            )}
            {directGames.map((g, i) => (
              <GameRow
                key={g.id}
                listing={g}
                index={i}
                playAllowed={playAllowed}
                onAccept={() => {
                  if (!playAllowed) {
                    onConnectWallet?.()
                    return
                  }
                  onJoinListing(g)
                }}
              />
            ))}
          </div>
        </section>

        <section
          className={`my-games panel lobby-section${showMy ? '' : ' is-hidden'}`}
          data-lobby-section="my"
        >
          <div className="panel-head">
            <div>
              <h2>YOUR GAMES</h2>
              <p>Your waiting, active, and settled tables.</p>
            </div>
          </div>
          <div className="my-game-cards" style={{ padding: '8px 0' }}>
            {myGames.openMine.length === 0 && myGames.past.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <strong>NO GAMES YET</strong>
                <p>Create a challenge to see it here.</p>
              </div>
            )}
            {myGames.openMine.map((g, i) => (
              <GameRow
                key={g.id}
                listing={g}
                index={i}
                playAllowed={playAllowed}
                onAccept={() => {
                  if (!playAllowed) {
                    onConnectWallet?.()
                    return
                  }
                  onJoinListing(g)
                }}
              />
            ))}
            {myGames.past.map((h) => (
              <HistoryCard key={h.id} entry={h} />
            ))}
          </div>
        </section>

        <div
          className={`lobby-layout lobby-section${showFloor ? '' : ' is-hidden'}`}
          data-lobby-section="floor"
        >
          <section className="games-panel panel">
            <div className="panel-head">
              <div>
                <h2>OPEN CHALLENGES</h2>
                <p>Anybody can step up. First to accept gets the seat.</p>
              </div>
              <div className="filters" aria-label="Filter open games by stake">
                {(
                  [
                    ['all', 'ALL'],
                    ['low', '≤50'],
                    ['mid', '51–250'],
                    ['high', '250+'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={stakeFilter === key ? 'active' : undefined}
                    onClick={() => setStakeFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="game-list">
              {filteredFloor.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <strong>NO OPEN TABLES</strong>
                  <p>Create a challenge to list it on the floor.</p>
                </div>
              )}
              {filteredFloor.map((g, i) => (
                <GameRow
                  key={g.id}
                  listing={g}
                  index={i}
                  playAllowed={playAllowed}
                  onAccept={() => {
                    if (!playAllowed) {
                      onConnectWallet?.()
                      return
                    }
                    onJoinListing(g)
                  }}
                />
              ))}
            </div>
          </section>

          <aside
            className={`side-column${showLeadersAside ? '' : ' is-hidden'}`}
            data-lobby-section-secondary="leaders"
          >
            <section className="panel leaderboard">
              <div className="panel-head">
                <div>
                  <h2>LEADERBOARD</h2>
                  <p>Settled games from local match history.</p>
                </div>
              </div>
              <div className="leader-list">
                {leaders.length === 0 && (
                  <div className="empty-state" style={{ padding: 18 }}>
                    <strong>NO STANDINGS YET</strong>
                    <p>Finish a match to climb the board.</p>
                  </div>
                )}
                {leaders.slice(0, 8).map((row, i) => (
                  <div key={row.playerId} className={`leader-row${i === 0 ? ' gold' : ''}`}>
                    <b>{i + 1}</b>
                    <span className={`avatar ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {initials(row.playerId)}
                    </span>
                    <div>
                      <strong>{shortId(row.playerId)}</strong>
                      <small>
                        {row.wins}W · {row.losses}L
                      </small>
                    </div>
                    <em>{row.carrotsWon} 🥕</em>
                  </div>
                ))}
              </div>
            </section>
            <section className="how-card simple-how">
              <span className="how-number">?</span>
              <div className="simple-how-copy">
                <h3>HOW TO PLAY</h3>
                <p>
                  Player A may peek privately. Player B chooses to keep or swap. Then selective
                  disclosure reveals the carrot and the winner takes the pot.
                </p>
                <button type="button" onClick={() => setRulesOpen(true)}>
                  READ THE RULES →
                </button>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <div
        className={`modal-backdrop${createOpen || rulesOpen ? ' show' : ''}`}
        onClick={() => {
          setCreateOpen(false)
          setRulesOpen(false)
        }}
        aria-hidden
      />
      <CreateChallengeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
        playAllowed={playAllowed}
        offlineSimulation={offlineSimulation}
      />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  )
}

function GameRow({
  listing,
  index,
  onAccept,
  playAllowed = true,
}: {
  listing: LobbyListing
  index: number
  onAccept: () => void
  playAllowed?: boolean
}) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  return (
    <article className="game-row">
      <div className="challenger">
        <span className={`avatar ${color}`}>{initials(listing.creatorId)}</span>
        <div>
          <strong>{shortId(listing.creatorId)}</strong>
          <small>
            {listing.access} · {listing.id.slice(0, 14)}
          </small>
        </div>
      </div>
      <div className="wager">
        <Icon id="carrot" />
        <div>
          <b>{listing.wager}</b>
          <small> WAGER</small>
        </div>
      </div>
      <div className="created">
        <b>{ageLabel(listing.createdAt)}</b>
        <span>OPEN CHALLENGE</span>
      </div>
      <button
        className="accept"
        type="button"
        disabled={!playAllowed}
        title={!playAllowed ? 'Connect Lace/1AM first' : undefined}
        onClick={onAccept}
      >
        {playAllowed ? 'ACCEPT' : 'CONNECT'}
      </button>
    </article>
  )
}

function HistoryCard({ entry }: { entry: MatchHistoryEntry }) {
  return (
    <article className="game-row">
      <div className="challenger">
        <span className="avatar orange">{initials(entry.creatorId)}</span>
        <div>
          <strong>{shortId(entry.creatorId)}</strong>
          <small>
            vs {entry.opponentId ? shortId(entry.opponentId) : '—'} · {entry.phase}
          </small>
        </div>
      </div>
      <div className="wager">
        <Icon id="carrot" />
        <div>
          <b>{entry.pot}</b>
          <small> POT</small>
        </div>
      </div>
      <div className="created">
        <b>{entry.winnerId ? shortId(entry.winnerId) : '—'}</b>
        <span>WINNER</span>
      </div>
      <button className="accept" type="button" disabled style={{ opacity: 0.5 }}>
        DONE
      </button>
    </article>
  )
}
