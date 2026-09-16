import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Button } from '@/ui/button'
import { HingedBox } from '@/components/HingedBox'
import { shortId, type FinalChoice, type GamePhase } from '@/domain/game'

export type ResultModalProps = {
  open: boolean
  phase: Extract<GamePhase, 'SETTLED' | 'FORFEITED'>
  winnerId?: string
  creatorId: string
  opponentId?: string
  decision?: FinalChoice
  revealedLocation?: 1 | 2
  pot: string
  wager: string
  onClose: () => void
}

/**
 * Full-screen result overlay — backdrop fade, staggered hinged-box open, pot punchline.
 * Respects prefers-reduced-motion (instant open, no stagger).
 */
export function ResultModal({
  open,
  phase,
  winnerId,
  creatorId,
  opponentId,
  decision,
  revealedLocation,
  pot,
  wager,
  onClose,
}: ResultModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const potRef = useRef<HTMLParagraphElement>(null)
  const [boxesOpen, setBoxesOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setBoxesOpen(false)
      return
    }

    let reduce = false
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      reduce = false
    }

    if (reduce) {
      setBoxesOpen(true)
    } else {
      setBoxesOpen(false)
      const t = window.setTimeout(() => setBoxesOpen(true), 280)
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (backdropRef.current) {
          gsap.fromTo(
            backdropRef.current,
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: 0.35, ease: 'power2.out' },
          )
        }
        if (panelRef.current) {
          gsap.fromTo(
            panelRef.current,
            { y: 36, autoAlpha: 0, scale: 0.94 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out', delay: 0.05 },
          )
        }
        if (potRef.current) {
          gsap.fromTo(
            potRef.current,
            { scale: 0.85, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(1.6)', delay: 0.55 },
          )
        }
      })
      return () => {
        window.clearTimeout(t)
        mm.revert()
      }
    }
  }, [open, phase, revealedLocation])

  if (!open) return null

  const winnerIsA = winnerId === creatorId
  const title =
    phase === 'FORFEITED'
      ? 'Timeout forfeit'
      : winnerIsA
        ? 'Player A takes the pot'
        : 'Player B takes the pot'

  const boxState = boxesOpen ? 'open' : 'closed'

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-carrot/40 bg-midnight-card p-6 shadow-2xl shadow-carrot/25"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft radial spotlight behind boxes */}
        <div
          className="pointer-events-none absolute -top-16 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-carrot/15 blur-3xl"
          aria-hidden
        />

        <p className="relative text-xs uppercase tracking-[0.25em] text-slate-500">Match result</p>
        <h2 id="result-title" className="relative mt-1 text-2xl font-black text-carrot">
          {title}
        </h2>
        <p ref={potRef} className="relative mt-2 text-sm text-slate-300">
          Winner <span className="font-semibold text-slate-100">{shortId(winnerId ?? '')}</span>
          {' · '}
          pot <span className="text-carrot font-semibold">{pot}</span> 🥕
          {' · '}
          stake {wager} each
        </p>

        {phase === 'SETTLED' && (
          <div className="relative mt-6 flex flex-wrap items-end justify-center gap-8">
            <HingedBox
              label="Box 1 · Player A"
              state={boxState}
              hasCarrot={revealedLocation === 1}
              feedback={
                boxesOpen
                  ? revealedLocation === 1
                    ? winnerIsA
                      ? 'win'
                      : 'reveal'
                    : winnerIsA
                      ? 'win'
                      : 'lose'
                  : 'idle'
              }
              highlight={boxesOpen && winnerIsA}
              openDelay={0}
            />
            <HingedBox
              label="Box 2 · Player B"
              state={boxState}
              hasCarrot={revealedLocation === 2}
              feedback={
                boxesOpen
                  ? revealedLocation === 2
                    ? !winnerIsA
                      ? 'win'
                      : 'reveal'
                    : !winnerIsA
                      ? 'win'
                      : 'lose'
                  : 'idle'
              }
              highlight={boxesOpen && !winnerIsA}
              openDelay={0.14}
            />
          </div>
        )}

        {phase === 'SETTLED' && (
          <p className="relative mt-4 text-center text-sm text-violet-200">
            Choice <strong>{decision}</strong> · carrot was in box{' '}
            <strong>{revealedLocation}</strong>
            {boxesOpen ? ' · commitment disclosed' : ' · opening…'}
          </p>
        )}

        {phase === 'FORFEITED' && (
          <p className="relative mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Decision window expired (or simulated). Commitment stays sealed — pot to Player A
            {opponentId ? ` (${shortId(creatorId)})` : ''}.
          </p>
        )}

        <div className="relative mt-6 flex justify-end">
          <Button onClick={onClose}>Continue</Button>
        </div>
      </div>
    </div>
  )
}
