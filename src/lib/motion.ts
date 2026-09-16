/** Shared motion helpers — respect reduced-motion everywhere GSAP runs. */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
