import { useMemo, useState } from 'react'
import { shortId } from '@/domain/game'
import {
  buildLeaderboard,
  clearMatchHistory,
  listMatchHistory,
  type MatchHistoryEntry,
} from '@/domain/matchHistory'

function statusClass(phase: MatchHistoryEntry['phase']): string {
  if (phase === 'SETTLED') return 'won'
  if (phase === 'FORFEITED') return 'lost'
  if (phase === 'CANCELLED') return 'cancelled'
  return 'active'
}

export function MatchHistoryPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [cleared, setCleared] = useState(0)
  const entries = useMemo(() => {
    void refreshKey
    void cleared
    return listMatchHistory().slice(0, 12)
  }, [refreshKey, cleared])
  const board = useMemo(() => {
    void refreshKey
    void cleared
    return buildLeaderboard().slice(0, 8)
  }, [refreshKey, cleared])

  return (
    <div className="history-skin">
      <div className="history-toolbar">
        <button
          className="text-button"
          type="button"
          disabled={entries.length === 0}
          onClick={() => {
            clearMatchHistory()
            setCleared((n) => n + 1)
          }}
        >
          CLEAR HISTORY
        </button>
      </div>

      <div className="history-list" id="matchHistoryList">
        {entries.length === 0 && (
          <div className="account-empty">
            <strong>No matches yet</strong>
            <p>Finish a local table to populate history in this browser.</p>
          </div>
        )}
        {entries.map((e) => (
          <div key={`${e.id}-${e.finishedAt}`} className="account-history-row">
            <div className="history-top">
              <b>
                {e.pot} 🥕 pot · {e.access}
              </b>
              <span className={`history-status ${statusClass(e.phase)}`}>{e.phase}</span>
            </div>
            <small>
              {shortId(e.creatorId)}
              {e.opponentId ? ` vs ${shortId(e.opponentId)}` : ''}
              {e.winnerId ? ` · won by ${shortId(e.winnerId)}` : ''}
            </small>
            <div className="history-values">
              <span>
                Finished
                <b>{new Date(e.finishedAt).toLocaleString()}</b>
              </span>
              <span>
                Pot
                <b>{e.pot} 🥕</b>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="eyebrow" style={{ marginTop: 28 }}>
        THIS BROWSER
      </div>
      <h3 className="history-leaders-title">LOCAL LEADERBOARD</h3>
      <p className="drawer-lead" style={{ marginTop: 0 }}>
        Wins, pots, and forfeits from match history.
      </p>
      <div className="history-list">
        {board.length === 0 && (
          <div className="account-empty">
            <strong>No ranked players yet</strong>
            <p>Settle or forfeit a match to seed the board.</p>
          </div>
        )}
        {board.map((row, i) => (
          <div key={row.playerId} className="leader-row">
            <b>#{i + 1}</b>
            <span className={`avatar ${['orange', 'pink', 'green', 'blue'][i % 4]}`}>
              {shortId(row.playerId, 2, 0).slice(0, 2)}
            </span>
            <div>
              <strong>{shortId(row.playerId, 8, 4)}</strong>
              <small>
                {row.wins}W / {row.losses}L · {row.settled} settled · {row.forfeitsWon} forfeit
                wins
              </small>
            </div>
            <em>{row.carrotsWon} 🥕</em>
          </div>
        ))}
      </div>
    </div>
  )
}
