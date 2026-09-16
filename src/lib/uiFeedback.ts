/**
 * Subtle optional UI feedback — CSS class flashes + tiny Web Audio beeps.
 * Sound is off by default; master toggle also mutes background <audio>.
 */

const SOUND_KEY = 'carrot-midnight:sound-enabled:v1'
const STASH_KEY = 'carrot-midnight:demo-stash:v1'
const BG_AUDIO_ID = 'backgroundMusic'

export type FeedbackKind = 'ok' | 'warn' | 'decide' | 'settle' | 'tap'

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) === '1'
  } catch {
    return false
  }
}

/** Mute/unmute background loop + gate UI beeps. */
export function applyBackgroundAudio(on: boolean): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById(BG_AUDIO_ID) as HTMLAudioElement | null
  if (!el) return
  el.muted = !on
  el.volume = on ? 0.32 : 0
  if (on) {
    void el.play().catch(() => undefined)
  } else {
    el.pause()
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
  applyBackgroundAudio(on)
}

/** Demo carrot stash for topbar — seeds 1000 on first read. */
export function getDemoStash(): number {
  try {
    const raw = localStorage.getItem(STASH_KEY)
    if (raw == null) {
      localStorage.setItem(STASH_KEY, '1000')
      return 1000
    }
    const n = Number(raw)
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1000
  } catch {
    return 1000
  }
}

export function setDemoStash(n: number): void {
  try {
    localStorage.setItem(STASH_KEY, String(Math.max(0, Math.floor(n))))
  } catch {
    /* ignore */
  }
}

let audioCtx: AudioContext | null = null

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!audioCtx) audioCtx = new AC()
  return audioCtx
}

/** Soft oscillator blip — skipped when sound disabled or reduced-motion. */
export function playFeedback(kind: FeedbackKind = 'tap'): void {
  if (!isSoundEnabled()) return
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
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
  void document.body.offsetWidth
  document.body.classList.add(cls)
  window.setTimeout(() => document.body.classList.remove(cls), 450)
  playFeedback(kind)
}
