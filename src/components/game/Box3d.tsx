import { useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import gsap from 'gsap'
import { Icon } from '@/components/game/SvgDefs'
import { prefersReducedMotion } from '@/lib/motion'

type Box3dProps = {
  open: boolean
  /** Partially lifted lid — used on the welcome / lobby stage. */
  ajar?: boolean
  locked?: boolean
  hasCarrot?: boolean
  empty?: boolean
  onClick?: () => void
  asButton?: boolean
  id?: string
  /** Subtle idle lid breathing when closed. */
  idle?: boolean
  /** Cartoon 3D yaw. */
  tilt?: 'left' | 'right'
  className?: string
  label?: string
}

const OPEN_ANGLE = -118
const AJAR_ANGLE = -42
const CLOSED_ANGLE = -4

export function Box3d({
  open,
  ajar = false,
  locked,
  hasCarrot,
  empty,
  onClick,
  asButton,
  id,
  idle = true,
  tilt = 'left',
  className,
  label,
}: Box3dProps) {
  const rootRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null)
  const lidRef = useRef<HTMLDivElement | null>(null)
  const markRef = useRef<HTMLDivElement | null>(null)
  const prizeRef = useRef<HTMLDivElement | null>(null)

  const classNames = [
    'box-3d',
    'hinged-box',
    open ? 'open' : '',
    ajar && !open ? 'ajar' : '',
    locked && !open ? 'locked' : '',
    hasCarrot ? 'has-carrot' : '',
    empty ? 'empty' : '',
    tilt === 'right' ? 'tilt-right' : 'tilt-left',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  useLayoutEffect(() => {
    const lid = lidRef.current
    const mark = markRef.current
    const prize = prizeRef.current
    const root = rootRef.current
    if (!lid || !root) return

    const reduced = prefersReducedMotion()
    const target = open ? OPEN_ANGLE : ajar ? AJAR_ANGLE : CLOSED_ANGLE
    const revealed = open || ajar

    const ctx = gsap.context(() => {
      gsap.set(lid, { transformOrigin: '50% 0%', transformPerspective: 900 })

      if (reduced) {
        gsap.set(lid, { rotateX: target })
        if (mark) gsap.set(mark, { opacity: revealed ? 0 : 1, scale: revealed ? 0.4 : 1 })
        if (prize) gsap.set(prize, { opacity: revealed ? 1 : 0, y: revealed ? 0 : 18, scale: revealed ? 1 : 0.4 })
        return
      }

      const tl = gsap.timeline()
      if (open) {
        tl.to(root, { y: -10, duration: 0.14, ease: 'power2.out' }).to(
          root,
          { y: 0, duration: 0.38, ease: 'power2.inOut' },
          0.12,
        )
      }

      tl.to(
        lid,
        {
          rotateX: target,
          duration: open ? 0.62 : 0.42,
          ease: open ? 'back.out(1.6)' : 'power3.inOut',
        },
        0,
      )

      if (mark) {
        if (revealed) {
          tl.to(mark, { opacity: 0, scale: 0.35, duration: 0.28, ease: 'power2.inOut' }, 0)
        } else {
          gsap.set(mark, { opacity: 1, scale: 1 })
        }
      }

      if (prize) {
        if (revealed) {
          tl.fromTo(
            prize,
            { opacity: 0, y: 22, scale: 0.35, rotate: -12 },
            { opacity: 1, y: -6, scale: 1, rotate: 8, duration: 0.5, ease: 'back.out(1.8)' },
            0.18,
          )
        } else {
          gsap.set(prize, { opacity: 0, y: 16, scale: 0.4, rotate: 0 })
        }
      }

      if (idle && !open && !ajar) {
        gsap.to(lid, {
          rotateX: CLOSED_ANGLE - 9,
          duration: 1.7,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.45,
        })
      }
    }, root)

    return () => ctx.revert()
  }, [open, ajar, idle, hasCarrot, empty])

  const inner = (
    <div className="box-rig" aria-hidden={!asButton}>
      <div className="box-body">
        <span className="box-grain" />
        <div className="box-interior">
          <div className="box-mark" ref={markRef}>
            {locked && !open && !ajar ? (
              <svg>
                <use href="#lock" />
              </svg>
            ) : (
              <b>?</b>
            )}
          </div>
          <div className="box-prize" ref={prizeRef}>
            {hasCarrot ? <Icon id="carrot" className="box-carrot" /> : null}
            {empty ? <span className="box-empty">EMPTY</span> : null}
          </div>
        </div>
      </div>
      <div className="box-lid" ref={lidRef}>
        <div className="box-lid-face">
          <i className="box-hinge left" />
          <i className="box-hinge right" />
        </div>
        <div className="box-lid-under" />
      </div>
    </div>
  )

  const aria = label ?? (open ? 'Open box' : locked ? 'Locked box' : 'Closed box')

  if (asButton) {
    return (
      <button
        className={classNames}
        id={id}
        type="button"
        onClick={onClick}
        aria-label={aria}
        ref={(el) => {
          rootRef.current = el
        }}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      className={classNames}
      id={id}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      aria-label={onClick ? aria : undefined}
      ref={(el) => {
        rootRef.current = el
      }}
    >
      {inner}
    </div>
  )
}
