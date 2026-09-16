import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  canCreatorCancel,
  canSettleReveal,
  canSubmitDecision,
  decisionDeadlineFromAcceptance,
  sampleCarrotLocation,
  type FinalChoice,
  type GameAccess,
  type GameRecord,
  type CarrotLocation,
} from '@/domain/game'
import { resolveWinnerId } from '@/domain/settlement'
import {
  listOpenGames,
  markLobbyCancelled,
  markLobbyTaken,
  upsertLobbyFromGame,
  type LobbyListing,
} from '@/domain/lobbyStore'
import { recordMatch } from '@/domain/matchHistory'
import {
  buildInviteUrl,
  clearInviteFromLocation,
  joinCodeFromGameId,
  parseInviteFromSearch,
  writeInviteToLocation,
} from '@/domain/invite'
import {
  findSessionByJoinCode,
  getTabSeat,
  loadSyncedSession,
  makeSyncedSession,
  saveSyncedSession,
  setTabSeat,
  subscribeSyncedSession,
  type SyncedPrivate,
  type SyncedSession,
} from '@/domain/sessionSync'

const PLAYER_A = 'player-a-local'
const PLAYER_B = 'player-b-local'

function fakeCommitment(location: CarrotLocation, salt: string): string {
  return `cm:${location}:${salt.slice(0, 12)}`
}

function applySession(
  session: SyncedSession,
  setters: {
    setGame: (g: GameRecord) => void
    setPrivateLocation: (l: CarrotLocation | null) => void
    setPrivateSalt: (s: string | null) => void
  },
) {
  setters.setGame(session.game)
  if (session.private) {
    setters.setPrivateLocation(session.private.location)
    setters.setPrivateSalt(session.private.salt)
  }
}

export function useLocalGame() {
  const [role, setRoleState] = useState<'A' | 'B'>('A')
  const [privateLocation, setPrivateLocation] = useState<CarrotLocation | null>(null)
  const [privateSalt, setPrivateSalt] = useState<string | null>(null)
  const [peeked, setPeeked] = useState(false)
  const [game, setGame] = useState<GameRecord | null>(null)
  const [lastChoiceFlash, setLastChoiceFlash] = useState<FinalChoice | null>(null)
  const [localAddress, setLocalAddress] = useState('mn_shield-addr_localdemo00000000000000000001')
  const [lobbyTick, setLobbyTick] = useState(0)
  const [historyTick, setHistoryTick] = useState(0)
  const [notice, setNotice] = useState(
    'Local demo mode — phases mirror Compact (incl. revealing). Share ?game= invite for multi-tab.',
  )
  const [banner, setBanner] = useState<'info' | 'ok' | 'warn'>('info')
  const [inviteBootstrapped, setInviteBootstrapped] = useState(false)
  const applyingRemote = useRef(false)
  const privRef = useRef<SyncedPrivate | null>(null)

  useEffect(() => {
    privRef.current =
      privateLocation != null && privateSalt != null
        ? { location: privateLocation, salt: privateSalt }
        : null
  }, [privateLocation, privateSalt])

  const setRole = useCallback(
    (next: 'A' | 'B') => {
      setRoleState(next)
      if (game) setTabSeat(game.id, next)
    },
    [game],
  )

  const refreshLobby = useCallback(() => setLobbyTick((n) => n + 1), [])

  const openListings = useMemo(() => {
    void lobbyTick
    return listOpenGames()
  }, [lobbyTick])

  const publish = useCallback((record: GameRecord, priv?: SyncedPrivate | null) => {
    const secrets = priv === undefined ? privRef.current : priv
    const session = makeSyncedSession(record, secrets)
    saveSyncedSession(session)
    upsertLobbyFromGame(record)
    setLobbyTick((n) => n + 1)
  }, [])

  const persist = useCallback(
    (record: GameRecord) => {
      if (applyingRemote.current) {
        upsertLobbyFromGame(record)
        setLobbyTick((n) => n + 1)
        return
      }
      publish(record)
    },
    [publish],
  )

  // Bootstrap from ?game= / ?join= once
  useEffect(() => {
    if (inviteBootstrapped) return
    setInviteBootstrapped(true)
    if (typeof window === 'undefined') return
    const { gameId, joinCode } = parseInviteFromSearch(window.location.search)
    let session: SyncedSession | null = null
    if (gameId) session = loadSyncedSession(gameId)
    if (!session && joinCode) session = findSessionByJoinCode(joinCode)
    if (!session) return

    applyingRemote.current = true
    applySession(session, { setGame, setPrivateLocation, setPrivateSalt })
    const existingSeat = getTabSeat(session.game.id)
    if (existingSeat) {
      setRoleState(existingSeat)
    } else {
      // Fresh tab opening an invite → Player B (creator tab already has seat A)
      setTabSeat(session.game.id, 'B')
      setRoleState('B')
    }
    writeInviteToLocation(session.game.id)
    setBanner('ok')
    setNotice(
      `Joined room ${session.game.id} via invite (code ${session.joinCode}). Multi-tab sync is on.`,
    )
    applyingRemote.current = false
    refreshLobby()
  }, [inviteBootstrapped, refreshLobby])

  // Cross-tab subscription while a game is active
  useEffect(() => {
    if (!game?.id) return
    return subscribeSyncedSession(game.id, (session) => {
      applyingRemote.current = true
      setGame(session.game)
      if (session.private) {
        setPrivateLocation(session.private.location)
        setPrivateSalt(session.private.salt)
      }
      upsertLobbyFromGame(session.game)
      setLobbyTick((n) => n + 1)
      applyingRemote.current = false
    })
  }, [game?.id])

  const createGame = useCallback(
    (access: GameAccess, wager: bigint, challenged?: string) => {
      const location = sampleCarrotLocation()
      const salt = crypto.randomUUID().replace(/-/g, '')
      setPrivateLocation(location)
      setPrivateSalt(salt)
      setPeeked(false)
      setLastChoiceFlash(null)
      setRoleState('A')
      const record: GameRecord = {
        id: `local-${Date.now()}`,
        access,
        creatorId: localAddress || PLAYER_A,
        challengedPlayerId: access === 'DIRECT' ? challenged?.trim() || PLAYER_B : undefined,
        wager,
        phase: 'WAITING_FOR_OPPONENT',
        createdAt: Date.now(),
        carrotCommitment: fakeCommitment(location, salt),
        chatCount: 0,
      }
      setTabSeat(record.id, 'A')
      setGame(record)
      publish(record, { location, salt })
      writeInviteToLocation(record.id)
      setBanner('ok')
      const code = joinCodeFromGameId(record.id)
      setNotice(
        access === 'DIRECT'
          ? `Direct challenge sent. Share invite code ${code} or the room link.`
          : `Open game listed. Invite code ${code} — open the link in another tab as Player B.`,
      )
    },
    [localAddress, publish],
  )

  const joinListing = useCallback(
    (listing: LobbyListing) => {
      const existing = loadSyncedSession(listing.id)
      if (existing) {
        applyingRemote.current = true
        applySession(existing, { setGame, setPrivateLocation, setPrivateSalt })
        setPeeked(false)
        setLastChoiceFlash(null)
        setTabSeat(listing.id, 'B')
        setRoleState('B')
        writeInviteToLocation(listing.id)
        setBanner('info')
        setNotice(`Joined ${listing.id} (synced session). Accept to start the decision window.`)
        applyingRemote.current = false
        refreshLobby()
        return
      }

      setPrivateLocation(null)
      setPrivateSalt(null)
      setPeeked(false)
      setLastChoiceFlash(null)
      const record: GameRecord = {
        id: listing.id,
        access: listing.access,
        creatorId: listing.creatorId,
        challengedPlayerId: listing.challengedPlayerId,
        wager: BigInt(listing.wager),
        phase: 'WAITING_FOR_OPPONENT',
        createdAt: listing.createdAt,
        carrotCommitment: 'cm:joined-listing',
        chatCount: 0,
      }
      const location = sampleCarrotLocation()
      const salt = crypto.randomUUID().replace(/-/g, '')
      setPrivateLocation(location)
      setPrivateSalt(salt)
      record.carrotCommitment = fakeCommitment(location, salt)
      setGame(record)
      setTabSeat(listing.id, 'B')
      setRoleState('B')
      publish(record, { location, salt })
      writeInviteToLocation(listing.id)
      setBanner('info')
      setNotice(`Joined ${listing.id}. Accept to start the decision window.`)
      refreshLobby()
    },
    [publish, refreshLobby],
  )

  const joinByCode = useCallback(
    (rawCode: string) => {
      const session = findSessionByJoinCode(rawCode)
      if (!session) {
        setBanner('warn')
        setNotice(`No open room for code ${rawCode.trim().toUpperCase()}. Create a game first.`)
        return false
      }
      applyingRemote.current = true
      applySession(session, { setGame, setPrivateLocation, setPrivateSalt })
      setPeeked(false)
      setLastChoiceFlash(null)
      setTabSeat(session.game.id, 'B')
      setRoleState('B')
      writeInviteToLocation(session.game.id)
      setBanner('ok')
      setNotice(`Joined via code ${session.joinCode}. You are Player B in this tab.`)
      applyingRemote.current = false
      refreshLobby()
      return true
    },
    [refreshLobby],
  )

  const acceptGame = useCallback(() => {
    setGame((g) => {
      if (!g || g.phase !== 'WAITING_FOR_OPPONENT') return g
      const acceptedAt = Date.now()
      const next: GameRecord = {
        ...g,
        opponentId: localAddress || PLAYER_B,
        acceptedAt,
        decisionDeadline: decisionDeadlineFromAcceptance(acceptedAt),
        phase: 'WAITING_FOR_DECISION',
      }
      markLobbyTaken(g.id)
      persist(next)
      return next
    })
    setRoleState('B')
    if (game) setTabSeat(game.id, 'B')
    setBanner('ok')
    setNotice('Accepted. Decision window open — Keep or Swap. Chat unlocked.')
    refreshLobby()
  }, [localAddress, persist, refreshLobby, game])

  const cancelGame = useCallback(() => {
    setGame((g) => {
      if (!g || !canCreatorCancel(g)) return g
      const next = { ...g, phase: 'CANCELLED' as const }
      markLobbyCancelled(g.id)
      persist(next)
      recordMatch(next)
      return next
    })
    setHistoryTick((n) => n + 1)
    setBanner('warn')
    setNotice('Open game cancelled.')
    refreshLobby()
  }, [persist, refreshLobby])

  const peek = useCallback(() => {
    if (role !== 'A' || privateLocation == null) return
    setPeeked(true)
    setBanner('info')
    setNotice(`Peek: carrot is in box ${privateLocation} (private — not on public ledger).`)
  }, [role, privateLocation])

  const decide = useCallback(
    (choice: FinalChoice) => {
      setLastChoiceFlash(choice)
      setGame((g) => {
        if (!g || !canSubmitDecision(g)) return g
        const next: GameRecord = {
          ...g,
          decision: choice,
          phase: 'WAITING_FOR_REVEAL',
        }
        persist(next)
        return next
      })
      setBanner('ok')
      setNotice(
        choice === 'KEEP'
          ? 'Keep locked in. Entering revealing phase — settle to open the commitment.'
          : 'Swap locked in. Entering revealing phase — settle to open the commitment.',
      )
    },
    [persist],
  )

  const settle = useCallback(() => {
    setGame((g) => {
      if (!g || !canSettleReveal(g) || privateLocation == null || !g.decision) return g
      const winnerId = resolveWinnerId(
        privateLocation,
        g.decision,
        g.creatorId,
        g.opponentId ?? PLAYER_B,
      )
      const next: GameRecord = {
        ...g,
        revealedLocation: privateLocation,
        winnerId,
        phase: 'SETTLED',
      }
      persist(next)
      recordMatch(next)
      return next
    })
    setHistoryTick((n) => n + 1)
    setBanner('ok')
    setNotice('Settled: commitment opened and pot awarded (local demo).')
  }, [persist, privateLocation])

  const forfeit = useCallback(() => {
    setGame((g) => {
      if (!g || g.phase !== 'WAITING_FOR_DECISION') return g
      const next: GameRecord = {
        ...g,
        phase: 'FORFEITED',
        winnerId: g.creatorId,
      }
      persist(next)
      recordMatch(next)
      return next
    })
    setHistoryTick((n) => n + 1)
    setBanner('warn')
    setNotice('Timeout forfeit → Player A wins the pot.')
  }, [persist])

  const recordChatHash = useCallback((cipherHash: string) => {
    setGame((g) => {
      if (!g) return g
      const next: GameRecord = {
        ...g,
        chatCount: (g.chatCount ?? 0) + 1,
        lastChatCipherHash: cipherHash,
      }
      persist(next)
      return next
    })
  }, [persist])

  const leaveToLobby = useCallback(() => {
    clearInviteFromLocation()
    setGame(null)
    setPeeked(false)
    setLastChoiceFlash(null)
    setBanner('info')
    setNotice('Back at the lobby. Create a game or paste a join code.')
  }, [])

  const boxStateA = useMemo(() => {
    if (!game) return 'closed' as const
    if (game.phase === 'SETTLED' || game.phase === 'FORFEITED') return 'open' as const
    if (game.phase === 'WAITING_FOR_REVEAL') return peeked && role === 'A' ? 'peek' : 'closed'
    if (role === 'A' && peeked) return 'peek' as const
    return 'closed' as const
  }, [game, role, peeked])

  const boxStateB = useMemo(() => {
    if (!game) return 'closed' as const
    if (game.phase === 'SETTLED' || game.phase === 'FORFEITED') return 'open' as const
    return 'closed' as const
  }, [game])

  const joinCode = game ? joinCodeFromGameId(game.id) : null
  const inviteUrl = game ? buildInviteUrl(game.id) : null

  return {
    role,
    setRole,
    game,
    notice,
    banner,
    privateLocation,
    privateSalt,
    peeked,
    lastChoiceFlash,
    localAddress,
    setLocalAddress,
    openListings,
    refreshLobby,
    historyTick,
    createGame,
    joinListing,
    joinByCode,
    acceptGame,
    cancelGame,
    peek,
    decide,
    settle,
    forfeit,
    recordChatHash,
    leaveToLobby,
    joinCode,
    inviteUrl,
    boxStateA,
    boxStateB,
    PLAYER_A,
    PLAYER_B,
  }
}
