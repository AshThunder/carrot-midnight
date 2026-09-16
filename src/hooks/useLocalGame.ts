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
  setActiveLobbyNetwork,
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
  loadTabPrivate,
  makeSyncedSession,
  saveSyncedSession,
  setTabSeat,
  subscribeSyncedSession,
  type SyncedPrivate,
  type SyncedSession,
} from '@/domain/sessionSync'
import type { NetworkKey } from '@/midnight/knownContracts'
import { allowsOfflineSimulation } from '@/domain/playMode'

const PLAYER_A = 'player-a-local'
const PLAYER_B = 'player-b-local'

function fakeCommitment(location: CarrotLocation, salt: string): string {
  return `cm:${location}:${salt.slice(0, 12)}`
}

/**
 * Apply a remote/public session into React state.
 * Never loads carrot secrets into state for joiners (Player B) or remote sync.
 * Seat A may restore tab-local private from sessionStorage via includeTabPrivate.
 */
function applySession(
  session: SyncedSession,
  setters: {
    setGame: (g: GameRecord) => void
    setPrivateLocation: (l: CarrotLocation | null) => void
    setPrivateSalt: (s: string | null) => void
  },
  opts?: { includeTabPrivate?: boolean },
) {
  setters.setGame(session.game)
  if (opts?.includeTabPrivate) {
    const priv = session.private ?? loadTabPrivate(session.game.id)
    if (priv) {
      setters.setPrivateLocation(priv.location)
      setters.setPrivateSalt(priv.salt)
      return
    }
  }
  setters.setPrivateLocation(null)
  setters.setPrivateSalt(null)
}

export function useLocalGame(networkKey: NetworkKey = 'local') {
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
    'Pick a network. Preprod/Preview need Lace/1AM. LOCAL allows offline lobby simulation.',
  )
  const [banner, setBanner] = useState<'info' | 'ok' | 'warn'>('info')
  const [inviteBootstrapped, setInviteBootstrapped] = useState(false)
  const applyingRemote = useRef(false)
  const privRef = useRef<SyncedPrivate | null>(null)
  const networkRef = useRef(networkKey)

  useEffect(() => {
    networkRef.current = networkKey
    setActiveLobbyNetwork(networkKey)
    setLobbyTick((n) => n + 1)
  }, [networkKey])

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
    return listOpenGames(networkKey)
  }, [lobbyTick, networkKey])

  const publish = useCallback((record: GameRecord, priv?: SyncedPrivate | null) => {
    if (!allowsOfflineSimulation(networkRef.current)) return
    const secrets = priv === undefined ? privRef.current : priv
    const session = makeSyncedSession(record, secrets)
    saveSyncedSession(session)
    upsertLobbyFromGame(record, networkRef.current)
    setLobbyTick((n) => n + 1)
  }, [])

  const persist = useCallback(
    (record: GameRecord) => {
      if (applyingRemote.current) {
        if (allowsOfflineSimulation(networkRef.current)) {
          upsertLobbyFromGame(record, networkRef.current)
          setLobbyTick((n) => n + 1)
        }
        return
      }
      publish(record)
    },
    [publish],
  )

  // Bootstrap from ?game= / ?join= once (local offline sim only)
  useEffect(() => {
    if (inviteBootstrapped) return
    setInviteBootstrapped(true)
    if (typeof window === 'undefined') return
    if (!allowsOfflineSimulation(networkKey)) return
    const { gameId, joinCode } = parseInviteFromSearch(window.location.search)
    let session: SyncedSession | null = null
    if (gameId) session = loadSyncedSession(gameId)
    if (!session && joinCode) session = findSessionByJoinCode(joinCode)
    if (!session) return

    applyingRemote.current = true
    const existingSeat = getTabSeat(session.game.id)
    if (existingSeat === 'A') {
      // Creator tab re-entry — restore tab-local secrets
      applySession(session, { setGame, setPrivateLocation, setPrivateSalt }, { includeTabPrivate: true })
      setRoleState('A')
    } else {
      // Fresh tab / Player B — never load private
      applySession(session, { setGame, setPrivateLocation, setPrivateSalt })
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
  }, [inviteBootstrapped, refreshLobby, networkKey])

  // Cross-tab subscription while a game is active — public game only, never private
  useEffect(() => {
    if (!game?.id) return
    if (!allowsOfflineSimulation(networkKey)) return
    return subscribeSyncedSession(game.id, (session) => {
      applyingRemote.current = true
      setGame(session.game)
      // Do not touch privateLocation / privateSalt — secrets stay tab-local for seat A
      upsertLobbyFromGame(session.game, networkRef.current)
      setLobbyTick((n) => n + 1)
      applyingRemote.current = false
    })
  }, [game?.id, networkKey])

  const createGame = useCallback(
    (access: GameAccess, wager: bigint, challenged?: string) => {
      if (!allowsOfflineSimulation(networkRef.current)) {
        setBanner('warn')
        setNotice('Offline lobby is only available on LOCAL. Switch network or connect a wallet.')
        return
      }
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
      if (!allowsOfflineSimulation(networkRef.current)) {
        setBanner('warn')
        setNotice('Offline lobby is only available on LOCAL.')
        return
      }
      const existing = loadSyncedSession(listing.id)
      applyingRemote.current = true
      // Joiner is always Player B — never load carrot secrets
      setPrivateLocation(null)
      setPrivateSalt(null)
      setPeeked(false)
      setLastChoiceFlash(null)
      if (existing) {
        setGame(existing.game)
      } else {
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
        setGame(record)
      }
      setTabSeat(listing.id, 'B')
      setRoleState('B')
      writeInviteToLocation(listing.id)
      setBanner('info')
      setNotice(`Joined ${listing.id} (synced session). Accept to start the decision window.`)
      applyingRemote.current = false
      refreshLobby()
    },
    [refreshLobby],
  )

  const joinByCode = useCallback(
    (rawCode: string) => {
      if (!allowsOfflineSimulation(networkRef.current)) {
        setBanner('warn')
        setNotice('Offline lobby is only available on LOCAL.')
        return false
      }
      const session = findSessionByJoinCode(rawCode)
      if (!session) {
        setBanner('warn')
        setNotice(`No open room for code ${rawCode.trim().toUpperCase()}. Create a game first.`)
        return false
      }
      applyingRemote.current = true
      // Player B — never load private
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
      markLobbyTaken(g.id, networkRef.current)
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
      markLobbyCancelled(g.id, networkRef.current)
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
    setNotice('Settled: commitment opened and pot awarded (browser simulation).')
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
