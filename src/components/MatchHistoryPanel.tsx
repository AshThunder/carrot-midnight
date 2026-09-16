import { useMemo, useState } from 'react'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { shortId } from '@/domain/game'
import {
  buildLeaderboard,
  clearMatchHistory,
  listMatchHistory,
  type MatchHistoryEntry,
} from '@/domain/matchHistory'

function phaseTone(phase: MatchHistoryEntry['phase']): string {
  if (phase === 'SETTLED') return 'border-carrot/40 bg-carrot/10 text-carrot'
  if (phase === 'FORFEITED') return 'border-red-400/40 bg-red-400/10 text-red-300'
  return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
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
    <section className="mx-auto grid max-w-5xl gap-6 px-4 pb-8 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Match history</CardTitle>
            <CardDescription>Settled · cancelled · forfeited (this browser).</CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={entries.length === 0}
            onClick={() => {
              clearMatchHistory()
              setCleared((n) => n + 1)
            }}
          >
            Clear
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.length === 0 && (
            <p className="rounded-xl border border-dashed border-midnight-border p-4 text-sm text-slate-500">
              Finish a local match to populate history.
            </p>
          )}
          {entries.map((e) => (
            <div
              key={`${e.id}-${e.finishedAt}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-midnight-border bg-midnight/40 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-200">
                  {e.pot} 🥕 pot · {e.access}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {shortId(e.creatorId)}
                  {e.opponentId ? ` vs ${shortId(e.opponentId)}` : ''}
                  {e.winnerId ? ` · won by ${shortId(e.winnerId)}` : ''}
                </p>
              </div>
              <Badge className={`font-normal ${phaseTone(e.phase)}`}>{e.phase}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Local leaderboard</CardTitle>
          <CardDescription>From your match history — wins, pots, forfeits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {board.length === 0 && (
            <p className="rounded-xl border border-dashed border-midnight-border p-4 text-sm text-slate-500">
              No ranked players yet.
            </p>
          )}
          {board.map((row, i) => (
            <div
              key={row.playerId}
              className="flex items-center justify-between gap-3 rounded-xl border border-midnight-border bg-midnight/40 px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 text-center font-mono text-slate-500">#{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-100">{shortId(row.playerId, 8, 4)}</p>
                  <p className="text-xs text-slate-500">
                    {row.wins}W / {row.losses}L · {row.settled} settled · {row.forfeitsWon} forfeit
                    wins
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-semibold text-carrot">{row.carrotsWon} 🥕</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
