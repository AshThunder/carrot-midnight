import { useEffect, useState } from 'react'

export type CountdownParts = {
  totalMs: number
  expired: boolean
  hours: number
  minutes: number
  seconds: number
  label: string
}

function partsFromMs(totalMs: number): CountdownParts {
  const clamped = Math.max(0, totalMs)
  const expired = totalMs <= 0
  const hours = Math.floor(clamped / 3_600_000)
  const minutes = Math.floor((clamped % 3_600_000) / 60_000)
  const seconds = Math.floor((clamped % 60_000) / 1_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const label = expired
    ? 'Expired — forfeit available'
    : hours > 0
      ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${pad(minutes)}:${pad(seconds)}`
  return { totalMs: clamped, expired, hours, minutes, seconds, label }
}

/** Tick every second toward `deadlineMs` (epoch ms). Null deadline → idle. */
export function useCountdown(deadlineMs: number | undefined | null): CountdownParts | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadlineMs == null) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [deadlineMs])

  if (deadlineMs == null) return null
  return partsFromMs(deadlineMs - now)
}
