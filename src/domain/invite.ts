/**
 * Shareable room invite helpers — URL query (?game= / ?join=) and short join codes.
 * Local demo multi-tab uses the same-origin session store + BroadcastChannel.
 */

export const INVITE_GAME_PARAM = 'game'
export const INVITE_JOIN_PARAM = 'join'

export type InviteParams = {
  gameId?: string
  joinCode?: string
}

/** Derive a short uppercase join code from a game id (stable, local-demo friendly). */
export function joinCodeFromGameId(gameId: string): string {
  const alnum = gameId.replace(/[^a-zA-Z0-9]/g, '')
  const tail = alnum.slice(-6).toUpperCase()
  return (tail || 'CARROT').padStart(6, 'X')
}

export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
}

export function parseInviteFromSearch(search: string): InviteParams {
  const q = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(q)
  const gameId = params.get(INVITE_GAME_PARAM)?.trim() || undefined
  const joinRaw = params.get(INVITE_JOIN_PARAM)?.trim()
  const joinCode = joinRaw ? normalizeJoinCode(joinRaw) : undefined
  return { gameId, joinCode }
}

/** Build relative search string for an invite (preserves other unrelated params if passed). */
export function buildInviteSearch(
  gameId: string,
  opts?: { includeJoinCode?: boolean; baseSearch?: string },
): string {
  const params = new URLSearchParams(
    opts?.baseSearch?.startsWith('?') ? opts.baseSearch.slice(1) : opts?.baseSearch ?? '',
  )
  params.set(INVITE_GAME_PARAM, gameId)
  if (opts?.includeJoinCode !== false) {
    params.set(INVITE_JOIN_PARAM, joinCodeFromGameId(gameId))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

export function buildInviteUrl(gameId: string, origin?: string, pathname?: string): string {
  const base =
    origin && pathname != null
      ? `${origin}${pathname}`
      : typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : ''
  return `${base}${buildInviteSearch(gameId)}`
}

/** Push invite query into the current history entry without reloading. */
export function writeInviteToLocation(gameId: string): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const url = `${window.location.pathname}${buildInviteSearch(gameId)}${window.location.hash}`
  window.history.replaceState(null, '', url)
}

export function clearInviteFromLocation(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  const params = new URLSearchParams(window.location.search)
  params.delete(INVITE_GAME_PARAM)
  params.delete(INVITE_JOIN_PARAM)
  const q = params.toString()
  const url = `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', url)
}
