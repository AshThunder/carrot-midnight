import { useEffect, useMemo, useState } from 'react'
import { HingedBox, type BoxFeedback } from '@/components/HingedBox'
import { PhaseBanner } from '@/components/PhaseBanner'
import { ChatPanel } from '@/components/ChatPanel'
import { DeadlineBar } from '@/components/DeadlineBar'
import { ResultModal } from '@/components/ResultModal'
import { InviteBar } from '@/components/InviteBar'
import { Button } from '@/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import type { useLocalGame } from '@/hooks/useLocalGame'
import { canCreatorCancel, canPostChat, canSettleReveal, shortId } from '@/domain/game'
import { potFromWager } from '@/domain/matchHistory'
import { flashUi } from '@/lib/uiFeedback'

type LocalGameApi = ReturnType<typeof useLocalGame>

export function Room({ api }: { api: LocalGameApi }) {
  const game = api.game
  const [resultOpen, setResultOpen] = useState(false)

  useEffect(() => {
    if (!game) return
    if (game.phase === 'SETTLED' || game.phase === 'FORFEITED') {
      setResultOpen(true)
      flashUi(game.phase === 'SETTLED' ? 'settle' : 'warn')
    }
  }, [game?.phase, game?.id])

  const feedbackA: BoxFeedback = useMemo(() => {
    if (!game) return 'idle'
    if (game.phase === 'WAITING_FOR_REVEAL' && api.lastChoiceFlash === 'KEEP') return 'keep'
    if (game.phase === 'WAITING_FOR_REVEAL' && api.lastChoiceFlash === 'SWAP') return 'swap'
    if (game.phase === 'SETTLED') {
      if (game.revealedLocation === 1) return game.winnerId === game.creatorId ? 'win' : 'reveal'
      return game.winnerId === game.creatorId ? 'win' : 'lose'
    }
    return 'idle'
  }, [game, api.lastChoiceFlash])

  const feedbackB: BoxFeedback = useMemo(() => {
    if (!game) return 'idle'
    if (game.phase === 'WAITING_FOR_REVEAL' && api.lastChoiceFlash === 'KEEP') return 'keep'
    if (game.phase === 'WAITING_FOR_REVEAL' && api.lastChoiceFlash === 'SWAP') return 'swap'
    if (game.phase === 'SETTLED') {
      if (game.revealedLocation === 2) return game.winnerId !== game.creatorId ? 'win' : 'reveal'
      return game.winnerId !== game.creatorId ? 'win' : 'lose'
    }
    return 'idle'
  }, [game, api.lastChoiceFlash])

  if (!game) return null

  const pot = potFromWager(game.wager)
  const youAreA = api.role === 'A'
  const showCarrotA =
    (api.role === 'A' && api.peeked && api.privateLocation === 1) ||
    (game.phase === 'SETTLED' && game.revealedLocation === 1)
  const showCarrotB =
    (api.role === 'A' && api.peeked && api.privateLocation === 2) ||
    (game.phase === 'SETTLED' && game.revealedLocation === 2)

  const bannerClass =
    api.banner === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
      : api.banner === 'warn'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        : 'border-midnight-border bg-midnight/50 text-slate-300'

  const roomKey = `carrot-room:${game.id}:${game.carrotCommitment ?? 'x'}`
  const decisionActive = game.phase === 'WAITING_FOR_DECISION'

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PhaseBanner phase={game.phase} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-slate-500">Demo seat</span>
          <Button
            size="sm"
            variant={api.role === 'A' ? 'default' : 'secondary'}
            onClick={() => {
              api.setRole('A')
              flashUi('tap')
            }}
            title="Player A creates, peeks, cancels open tables"
          >
            Player A {youAreA ? '· you' : ''}
          </Button>
          <Button
            size="sm"
            variant={api.role === 'B' ? 'default' : 'secondary'}
            onClick={() => {
              api.setRole('B')
              flashUi('tap')
            }}
            title="Player B accepts, Keep/Swap, cannot peek"
          >
            Player B {!youAreA ? '· you' : ''}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-midnight-border bg-midnight-card/80 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-slate-500">Pot</p>
          <p className="text-2xl font-black text-carrot">{pot} 🥕</p>
          <p className="text-xs text-slate-400">{game.wager.toString()} each side</p>
        </div>
        <div className="rounded-xl border border-midnight-border bg-midnight-card/80 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-slate-500">Player A · creator</p>
          <p className="font-semibold text-slate-100">{shortId(game.creatorId)}</p>
          <p className="text-xs text-slate-400">
            Peek · cancel open · wins on timeout
            {youAreA ? ' · acting now' : ''}
          </p>
        </div>
        <div className="rounded-xl border border-midnight-border bg-midnight-card/80 px-4 py-3">
          <p className="text-xs uppercase tracking-widest text-slate-500">Player B · challenger</p>
          <p className="font-semibold text-slate-100">
            {game.opponentId ? shortId(game.opponentId) : '— waiting —'}
          </p>
          <p className="text-xs text-slate-400">
            Accept · Keep/Swap · no peek
            {!youAreA ? ' · acting now' : ''}
          </p>
        </div>
      </div>

      {api.inviteUrl && api.joinCode && (
        <InviteBar gameId={game.id} joinCode={api.joinCode} inviteUrl={api.inviteUrl} />
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>
            Room {game.id} · {game.access}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge className="font-normal text-carrot">pot {pot} 🥕</Badge>
            {game.chatCount ? (
              <Badge className="font-normal text-slate-300">chat ×{game.chatCount}</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end justify-center gap-10 py-4">
            <HingedBox
              label="Box 1 · Player A"
              state={api.boxStateA}
              hasCarrot={!!showCarrotA}
              highlight={api.role === 'A'}
              feedback={feedbackA}
            />
            <HingedBox
              label="Box 2 · Player B"
              state={api.boxStateB}
              hasCarrot={!!showCarrotB}
              highlight={api.role === 'B'}
              feedback={feedbackB}
            />
          </div>

          <p className={`rounded-xl border px-4 py-3 text-sm ${bannerClass}`}>{api.notice}</p>

          <DeadlineBar deadlineMs={game.decisionDeadline} active={decisionActive} />

          {game.phase === 'WAITING_FOR_REVEAL' && (
            <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              Decision: <strong>{game.decision}</strong>. Commitment still sealed — settle to reveal
              the carrot and award the pot ({pot} 🥕).
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {game.phase === 'WAITING_FOR_OPPONENT' && (
              <>
                <Button
                  onClick={() => {
                    api.acceptGame()
                    flashUi('ok')
                  }}
                >
                  Accept (as Player B)
                </Button>
                {canCreatorCancel(game) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      api.cancelGame()
                      flashUi('warn')
                    }}
                  >
                    Cancel open game
                  </Button>
                )}
              </>
            )}
            {api.role === 'A' &&
              game.phase !== 'CANCELLED' &&
              game.phase !== 'SETTLED' &&
              game.phase !== 'FORFEITED' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    api.peek()
                    flashUi('tap')
                  }}
                >
                  Private peek (A only)
                </Button>
              )}
            {game.phase === 'WAITING_FOR_DECISION' && api.role === 'B' && (
              <>
                <Button
                  onClick={() => {
                    api.decide('KEEP')
                    flashUi('decide')
                  }}
                >
                  Keep
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    api.decide('SWAP')
                    flashUi('decide')
                  }}
                >
                  Swap
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    api.forfeit()
                    flashUi('warn')
                  }}
                >
                  Simulate timeout forfeit
                </Button>
              </>
            )}
            {decisionActive && api.role === 'A' && (
              <Button
                variant="ghost"
                onClick={() => {
                  api.forfeit()
                  flashUi('warn')
                }}
              >
                Claim forfeit (timeout)
              </Button>
            )}
            {canSettleReveal(game) && (
              <Button
                onClick={() => {
                  api.settle()
                  flashUi('settle')
                }}
              >
                Settle · open boxes
              </Button>
            )}
            {(game.phase === 'SETTLED' || game.phase === 'FORFEITED') && (
              <Button variant="outline" onClick={() => setResultOpen(true)}>
                Replay result
              </Button>
            )}
          </div>

          {game.phase === 'SETTLED' && (
            <div className="rounded-xl bg-carrot/10 p-4 text-carrot">
              Winner: {shortId(game.winnerId ?? '')} · revealed box {game.revealedLocation} · choice{' '}
              {game.decision} · pot {pot} 🥕
            </div>
          )}
          {game.phase === 'FORFEITED' && (
            <div className="rounded-xl bg-red-500/10 p-4 text-red-300">
              Forfeited to {shortId(game.winnerId ?? game.creatorId)} (Player A) · pot {pot} 🥕
            </div>
          )}
          {game.phase === 'CANCELLED' && (
            <div className="rounded-xl bg-slate-500/10 p-4 text-slate-300">
              Open game cancelled — no pot transferred.
            </div>
          )}
        </CardContent>
      </Card>

      <ChatPanel
        enabled={canPostChat(game) || game.phase === 'SETTLED'}
        roomKey={roomKey}
        senderLabel={api.role === 'A' ? 'A' : 'B'}
        onCipherPosted={api.recordChatHash}
      />

      {(game.phase === 'SETTLED' || game.phase === 'FORFEITED') && (
        <ResultModal
          open={resultOpen}
          phase={game.phase}
          winnerId={game.winnerId}
          creatorId={game.creatorId}
          opponentId={game.opponentId}
          decision={game.decision}
          revealedLocation={game.revealedLocation}
          pot={pot}
          wager={game.wager.toString()}
          onClose={() => setResultOpen(false)}
        />
      )}
    </section>
  )
}
