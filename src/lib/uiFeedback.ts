/**
 * Subtle optional UI feedback — CSS class flashes + tiny Web Audio beeps.
 * Sound is off by default; no asset files required.
 */

const SOUND_KEY = 'carrot-midnight:sound-enabled:v1'

export type FeedbackKind = 'ok' | 'warn' | 'decide' | 'settle' | 'tap'

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  return audioCtx
}

/** Soft oscillator blip — skipped when sound disabled or reduced-motion. */
export function playFeedback(kind: FeedbackKind = 'tap'): void {
  if (!isSoundEnabled()) return
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  const ac = ctx()
  if (!ac) return
  void ac.resume().catch(() => undefined)

  const freqs: Record<FeedbackKind, number[]> = {
    tap: [520],
    ok: [440, 660],
    warn: [320, 260],
    decide: [500, 640],
    settle: [392, 523, 659],
  }
  const notes = freqs[kind]
  const t0 = ac.currentTime
  notes.forEach((f, i) => {
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.value = 0.0001
    g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.02 + i * 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18 + i * 0.06)
    o.connect(g)
    g.connect(ac.destination)
    o.start(t0 + i * 0.05)
    o.stop(t0 + 0.22 + i * 0.06)
  })
}

/** Flash a CSS class on document body briefly (pairs with index.css). */
export function flashUi(kind: FeedbackKind = 'tap'): void {
  if (typeof document === 'undefined') return
  const cls = `ui-flash-${kind}`
  document.body.classList.remove(cls)
  // force reflow so re-adding retriggers animation
  void document.body.offsetWidth
  document.body.classList.add(cls)
  window.setTimeout(() => document.body.classList.remove(cls), 450)
  playFeedback(kind)
}
