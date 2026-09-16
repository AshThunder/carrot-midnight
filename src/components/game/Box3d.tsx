import { useEffect, useRef, type ReactNode, type RefCallback } from 'react'
import gsap from 'gsap'

export type HingedBoxProps = {
  open: boolean
  locked?: boolean
  hasCarrot?: boolean
  empty?: boolean
  onClick?: () => void
  asButton?: boolean
  id?: string
  className?: string
  /** Soft idle hinge bob when closed (welcome / lobby demos). */
  idle?: boolean
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.body.classList.contains('reduced-motion')
  )
}

/**
 * Wooden hinged box with a GSAP-driven lid (rotateX on the back edge).
 * Open/close is obvious in Room peek + settle; idle mode gently peeks on welcome.
 */
export function HingedBox({
  open,
  locked,
  hasCarrot,
  empty,
  onClick,
  asButton,
  id,
  className: extraClass,
  idle = false,
}: HingedBoxProps) {
  const rootRef = useRef<HTMLElement | null>(null)
  const lidRef = useRef<HTMLDivElement | null>(null)
  const idleTween = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null)

  useEffect(() => {
    const lid = lidRef.current
    if (!lid) return

    gsap.set(lid, {
      transformOrigin: '50% 0%',
      transformPerspective: 900,
      force3D: true,
    })

    const reduced = prefersReducedMotion()
    idleTween.current?.kill()
    idleTween.current = null

    if (idle && !open && !reduced) {
      idleTween.current = gsap
        .timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut' } })
        .to(lid, { rotateX: -28, duration: 1.35 })
        .to(lid, { rotateX: -8, duration: 1.1 })
      return () => {
        idleTween.current?.kill()
        idleTween.current = null
      }
    }

    if (reduced) {
      gsap.set(lid, { rotateX: open ? -122 : 0 })
      return
    }

    const tween = gsap.to(lid, {
      rotateX: open ? -122 : 0,
      duration: open ? 0.78 : 0.58,
      ease: open ? 'back.out(1.15)' : 'power2.inOut',
      overwrite: 'auto',
    })

    const root = rootRef.current
    if (root && open) {
      gsap.fromTo(
        root,
        { y: 0 },
        { y: -7, duration: 0.16, yoyo: true, repeat: 1, ease: 'power1.out', overwrite: 'auto' },
      )
    }

    return () => {
      tween.kill()
    }
  }, [open, idle])

  const className = [
    'box-3d',
    'hinged-box',
    open ? 'open' : '',
    locked ? 'locked' : '',
    hasCarrot ? 'has-carrot' : '',
    empty ? 'empty' : '',
    idle ? 'idle' : '',
    extraClass ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const inner: ReactNode = (
    <>
      <div className="box-body" aria-hidden>
        <span className="box-grain" />
        <span className="hinge hinge-left" />
        <span className="hinge hinge-right" />
      </div>
      <div className="lid" ref={lidRef}>
        <span className="lid-face" />
        <span className="lid-edge" />
        <span className="lid-hinge-bar" />
      </div>
      <div className="front">
        {locked && !open ? (
          <svg>
            <use href="#lock" />
          </svg>
        ) : open && hasCarrot ? (
          <b className="reveal-carrot" aria-hidden>
            🥕
          </b>
        ) : open && empty ? (
          <b className="reveal-empty">EMPTY</b>
        ) : (
          <b>?</b>
        )}
      </div>
    </>
  )

  const setRef: RefCallback<HTMLElement> = (node) => {
    rootRef.current = node
  }

  if (asButton) {
    return (
      <button
        className={className}
        id={id}
        type="button"
        onClick={onClick}
        ref={setRef as RefCallback<HTMLButtonElement>}
        aria-pressed={open}
      >
        {inner}
      </button>
    )
  }

  return (
    <div
      className={className}
      id={id}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      ref={setRef as RefCallback<HTMLDivElement>}
    >
      {inner}
    </div>
  )
}

/** Alias kept for existing Room / imports — same as HingedBox. */
export const Box3d = HingedBox
