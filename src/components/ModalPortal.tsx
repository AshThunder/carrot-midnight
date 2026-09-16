import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Render overlays on document.body so transformed/stacking ancestors
 * cannot trap z-index or leak backdrop-filter blur onto dialog contents.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined' || !document.body) return null
  return createPortal(children, document.body)
}
