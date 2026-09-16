import { Badge } from '@/ui/badge'
import type { GamePhase } from '@/domain/game'

const LABELS: Record<GamePhase, string> = {
  WAITING_FOR_OPPONENT: 'Waiting for opponent',
  WAITING_FOR_DECISION: 'Decision window',
  WAITING_FOR_REVEAL: 'Revealing',
  SETTLED: 'Settled',
  CANCELLED: 'Cancelled',
  FORFEITED: 'Forfeited (timeout)',
}

const TONE: Record<GamePhase, string> = {
  WAITING_FOR_OPPONENT: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
  WAITING_FOR_DECISION: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  WAITING_FOR_REVEAL: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
  SETTLED: 'border-carrot/40 bg-carrot/10 text-carrot',
  CANCELLED: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  FORFEITED: 'border-red-400/40 bg-red-400/10 text-red-300',
}

export function PhaseBanner({ phase }: { phase: GamePhase }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge className={TONE[phase]}>{LABELS[phase]}</Badge>
      <span className="text-xs uppercase tracking-widest text-slate-500">Carrot Midnight</span>
    </div>
  )
}
