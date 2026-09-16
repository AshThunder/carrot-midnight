import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export type BoxAnimState = 'closed' | 'open' | 'peek'

export type BoxFeedback = 'idle' | 'keep' | 'swap' | 'reveal' | 'win' | 'lose'

interface HingedBoxProps {
  label: string
  state: BoxAnimState
  hasCarrot?: boolean
  highlight?: boolean
  feedback?: BoxFeedback
  /** Extra delay (seconds) before lid opens — used for result-modal stagger. */
  openDelay?: number
  className?: string
}

/**
 * GSAP hinged box theatre: lid pivots on the top edge, carrot reveals after the lid,
 * Keep/Swap/reveal feedback pulses. Respects prefers-reduced-motion via matchMedia.
 */
export function HingedBox({
  label,
  state,
  hasCarrot = false,
  highlight = false,
  feedback = 'idle',
  openDelay = 0,
  className = '',
}: HingedBoxProps) {
  const lidRef = useRef<HTMLDivElement>(null)
  const carrotRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const sparkRef = useRef<HTMLDivElement>(null)
  const prevState = useRef<BoxAnimState>(state)

  useEffect(() => {
    const lid = lidRef.current
    const carrot = carrotRef.current
    const glow = glowRef.current
    const spark = sparkRef.current
    if (!lid) return

    const mm = gsap.matchMedia()
    mm.add(
      {
        reduce: '(prefers-reduced-motion: reduce)',
        motion: '(prefers-reduced-motion: no-preference)',
      },
      (ctx) => {
        const { reduce } = ctx.conditions as { reduce: boolean }
        const opening = state !== 'closed' && prevState.current === 'closed'
        const closing = state === 'closed' && prevState.current !== 'closed'
        prevState.current = state

        const openAngle = state === 'closed' ? 0 : state === 'peek' ? -52 : -122
        const easeOpen = state === 'peek' ? 'power2.out' : 'back.out(1.25)'
        const easeClose = 'power3.inOut'
        const delay = reduce ? 0 : opening ? openDelay : 0
        const lidDur = reduce ? 0 : state === 'peek' ? 0.5 : closing ? 0.6 : 0.9
        const carrotAt = reduce ? 0 : opening ? (state === 'peek' ? 0.2 : 0.4) : 0

        const tl = gsap.timeline({ defaults: { overwrite: 'auto' }, delay })

        tl.to(
          lid,
          {
            rotationX: openAngle,
            duration: lidDur,
            ease: closing ? easeClose : easeOpen,
            transformOrigin: '50% 0%',
          },
          0,
        )

        if (!reduce && state !== 'closed') {
          tl.to(
            lid,
            {
              y: state === 'peek' ? -3 : -5,
              duration: lidDur * 0.85,
              ease: 'power2.out',
            },
            0,
          )
        } else {
          gsap.set(lid, { y: 0 })
        }

        if (carrot) {
          const show = state !== 'closed' && hasCarrot
          const ghost = state !== 'closed' && !hasCarrot
          tl.to(
            carrot,
            {
              autoAlpha: show ? 1 : ghost ? 0.1 : 0,
              y: state === 'closed' ? 18 : show ? -10 : 4,
              scale: show ? 1.18 : ghost ? 0.65 : 0.5,
              rotation: show ? -10 : 0,
              duration: reduce ? 0 : show ? 0.58 : 0.32,
              ease: show ? 'back.out(2.4)' : 'power2.in',
            },
            carrotAt,
          )
          if (show && !reduce) {
            tl.to(
              carrot,
              { y: -2, scale: 1.02, rotation: -2, duration: 0.38, ease: 'power2.out' },
              carrotAt + 0.48,
            )
          }
        }

        if (glow && !reduce) {
          const glowAlpha =
            feedback === 'reveal' || feedback === 'win'
              ? 0.95
              : feedback === 'keep' || feedback === 'swap'
                ? 0.55
                : highlight
                  ? 0.4
                  : 0
          tl.to(glow, { autoAlpha: glowAlpha, duration: 0.4, ease: 'power2.out' }, 0)
          if (feedback === 'keep' || feedback === 'swap') {
            tl.fromTo(
              glow,
              { scale: 0.85 },
              { scale: 1.18, duration: 0.42, yoyo: true, repeat: 1, ease: 'sine.inOut' },
              0.05,
            )
          }
          if ((feedback === 'win' || feedback === 'reveal') && opening) {
            tl.fromTo(
              glow,
              { scale: 0.7 },
              { scale: 1.25, duration: 0.55, ease: 'power2.out' },
              0.15,
            )
          }
        } else if (glow && reduce) {
          gsap.set(glow, {
            autoAlpha:
              feedback === 'win' || feedback === 'reveal' ? 0.7 : highlight ? 0.35 : 0,
          })
        }

        if (spark && !reduce && opening && hasCarrot && state === 'open') {
          tl.fromTo(
            spark,
            { autoAlpha: 0, scale: 0.4 },
            { autoAlpha: 0.9, scale: 1.2, duration: 0.35, ease: 'power2.out' },
            0.35,
          )
          tl.to(spark, { autoAlpha: 0, scale: 1.6, duration: 0.45, ease: 'power2.in' }, 0.7)
        } else if (spark) {
          gsap.set(spark, { autoAlpha: 0 })
        }
      },
    )

    return () => mm.revert()
  }, [state, hasCarrot, feedback, highlight, openDelay])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        root,
        { y: 16, autoAlpha: 0, rotateY: -6 },
        { y: 0, autoAlpha: 1, rotateY: 0, duration: 0.5, ease: 'power3.out' },
      )
    })
    return () => mm.revert()
  }, [])

  const rim =
    feedback === 'win'
      ? 'border-carrot shadow-[0_0_36px_rgba(249,115,22,0.6)]'
      : feedback === 'lose'
        ? 'border-slate-600 opacity-75'
        : feedback === 'swap'
          ? 'border-violet-400 shadow-[0_0_28px_rgba(167,139,250,0.4)]'
          : feedback === 'keep'
            ? 'border-emerald-400 shadow-[0_0_28px_rgba(52,211,153,0.4)]'
            : highlight
              ? 'border-carrot shadow-[0_0_24px_rgba(249,115,22,0.35)]'
              : 'border-amber-800'

  return (
    <div
      ref={rootRef}
      className={`relative flex w-40 flex-col items-center ${className}`}
      style={{ perspective: '960px' }}
    >
      <div
        className={`relative h-32 w-36 rounded-md border-2 ${rim} bg-gradient-to-b from-amber-700 to-amber-950 transition-[box-shadow,border-color] duration-300`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 z-10 rounded-md bg-carrot/30 opacity-0"
          aria-hidden
        />
        <div
          ref={sparkRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-30 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-carrot/40 opacity-0 blur-md"
          aria-hidden
        />
        {/* Hinge pin */}
        <div className="absolute left-1/2 top-0 z-30 h-2 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-950 shadow-md" />
        <div
          ref={lidRef}
          className="absolute inset-x-0 top-0 z-20 h-11 rounded-t-md border-b-2 border-amber-950 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800"
          style={{
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 0%',
            backfaceVisibility: 'hidden',
          }}
        >
          <div className="mx-auto mt-2.5 h-2.5 w-12 rounded-full bg-amber-950/55" />
          <div className="absolute inset-x-3 bottom-1 h-px bg-amber-950/30" />
        </div>
        <div className="flex h-full items-end justify-center pb-4">
          <div ref={carrotRef} className="origin-bottom text-4xl opacity-0" aria-hidden={!hasCarrot}>
            🥕
          </div>
        </div>
        {/* Inner box floor */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 h-3 rounded bg-amber-950/40" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-300">{label}</p>
    </div>
  )
}
