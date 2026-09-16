import { useCountdown } from '@/hooks/useCountdown'
import { Badge } from '@/ui/badge'

/** Decision-window countdown + forfeit urgency strip. */
export function DeadlineBar({
  deadlineMs,
  active,
}: {
  deadlineMs?: number
  active: boolean
}) {
  const cd = useCountdown(active ? deadlineMs : null)
  if (!active || !deadlineMs || !cd) return null

  const windowMs = 3_600_000
  const remainingRatio = Math.min(1, Math.max(0, cd.totalMs / windowMs))
  const urgency = cd.expired
    ? 'expired'
    : remainingRatio < 0.15
      ? 'critical'
      : remainingRatio < 0.4
        ? 'warn'
        : 'ok'

  const barColor =
    urgency === 'expired'
      ? 'bg-red-500'
      : urgency === 'critical'
        ? 'bg-amber-400'
        : urgency === 'warn'
          ? 'bg-amber-500/80'
          : 'bg-emerald-400/80'

  const boxClass =
    urgency === 'expired'
      ? 'border-red-400/40 bg-red-500/10 text-red-100'
      : urgency === 'critical'
        ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
        : 'border-sky-400/30 bg-sky-500/10 text-sky-100'

  return (
    <div className={`rounded-xl border px-4 py-3 ${boxClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">Decision deadline</p>
          <p className="font-mono text-lg font-semibold tabular-nums">{cd.label}</p>
        </div>
        <Badge className="font-normal">
          {cd.expired ? 'Forfeit timer elapsed' : 'Keep / Swap before expiry'}
        </Badge>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ${barColor} ${
            urgency === 'critical' || urgency === 'expired' ? 'ui-pulse-bar' : ''
          }`}
          style={{ width: cd.expired ? '100%' : `${Math.max(4, remainingRatio * 100)}%` }}
        />
      </div>
      {cd.expired && (
        <p className="mt-2 text-xs opacity-90">
          Player A may claim via forfeit (local: use Simulate timeout forfeit / Claim forfeit).
        </p>
      )}
    </div>
  )
}
