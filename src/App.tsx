import { useEffect, useMemo, useState } from 'react'
import { Lobby } from '@/components/Lobby'
import { Room } from '@/components/Room'
import { ConnectionPanel } from '@/components/ConnectionPanel'
import { MatchHistoryPanel } from '@/components/MatchHistoryPanel'
import { SvgDefs } from '@/components/game/SvgDefs'
import { WelcomeScreen } from '@/components/game/WelcomeScreen'
import { Topbar, type LobbyTab } from '@/components/game/Topbar'
import { RulesModal } from '@/components/game/RulesModal'
import { useLocalGame } from '@/hooks/useLocalGame'
import { useMidnightConnection } from '@/hooks/useMidnightConnection'
import { isSoundEnabled, setSoundEnabled, flashUi, applyBackgroundAudio, getDemoStash } from '@/lib/uiFeedback'
import { shortId } from '@/domain/game'
import {
  canPerformGameplay,
  gameplayBlockedReason,
  isLiveNetwork,
  isOfflineSimulationMode,
  networkModeLabel,
  welcomeNetworkLabel,
} from '@/domain/playMode'
import '@midnight-ntwrk/dapp-connector-api'

type DrawerId = 'settings' | 'history' | null

export function App() {
  const midnight = useMidnightConnection()
  const api = useLocalGame(midnight.networkKey)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const [welcomeHidden, setWelcomeHidden] = useState(false)
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('floor')
  const [drawer, setDrawer] = useState<DrawerId>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const walletStatus = midnight.snapshot.walletStatus
  const playAllowed = canPerformGameplay(midnight.networkKey, walletStatus)
  const blockedReason = gameplayBlockedReason(midnight.networkKey, walletStatus)
  const offlineSim = isOfflineSimulationMode(midnight.networkKey, walletStatus)

  const pill = networkModeLabel(midnight.networkKey, walletStatus)
  const welcomeNet = welcomeNetworkLabel(midnight.networkKey, walletStatus)

  const walletLabel = useMemo(() => {
    const addr = midnight.wallet.address || api.localAddress
    if (walletStatus === 'local-demo' && midnight.networkKey === 'local') {
      return `Demo · ${shortId(addr)}`
    }
    if (walletStatus === 'connected') return shortId(addr)
    return midnight.wallet.label || 'Connect'
  }, [
    midnight.wallet.address,
    midnight.wallet.label,
    walletStatus,
    midnight.networkKey,
    api.localAddress,
  ])

  const myCount = useMemo(() => {
    const openMine = api.openListings.filter(
      (g) => g.creatorId === api.localAddress || g.challengedPlayerId === api.localAddress,
    )
    return openMine.length
  }, [api.openListings, api.localAddress])

  const directCount = useMemo(
    () =>
      api.openListings.filter(
        (g) =>
          g.access === 'DIRECT' &&
          (g.challengedPlayerId === api.localAddress || g.creatorId === api.localAddress),
      ).length,
    [api.openListings, api.localAddress],
  )

  /** Topbar stash: demo only on LOCAL; hide fake stash on Preprod/Preview (no balance API yet). */
  const stashDisplay = useMemo(() => {
    if (isLiveNetwork(midnight.networkKey)) {
      // Real wallet balance not wired yet — hide rather than show getDemoStash() 1000.
      return { value: null as number | null, kind: null as 'demo' | 'wallet' | null }
    }
    // LOCAL / local-demo
    return { value: getDemoStash(), kind: 'demo' as const }
  }, [midnight.networkKey])

  const toggleSound = () => {
    const next = !soundOn
    setSoundEnabled(next)
    setSoundOn(next)
    applyBackgroundAudio(next)
    if (next) flashUi('tap')
  }

  useEffect(() => {
    applyBackgroundAudio(soundOn)
  }, [soundOn])

  const closeDrawer = () => setDrawer(null)

  const inRoom = !!api.game

  useEffect(() => {
    if (api.game) setWelcomeHidden(true)
  }, [api.game])

  // Keep player id in sync with connected Lace/1AM (or demo) address.
  useEffect(() => {
    const addr = midnight.wallet.address
    if (addr && (walletStatus === 'connected' || walletStatus === 'local-demo')) {
      api.setLocalAddress(addr)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setLocalAddress is stable enough; avoid api object churn
  }, [midnight.wallet.address, walletStatus])

  // If live network without wallet while sitting in a simulated room, kick to lobby.
  useEffect(() => {
    if (api.game && isLiveNetwork(midnight.networkKey) && walletStatus !== 'connected') {
      api.leaveToLobby()
      setDrawer('settings')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.game, midnight.networkKey, walletStatus])

  /** Keep Settings + Topbar network in sync; leave demo when picking a live net. */
  const handleNetworkChange = (k: typeof midnight.networkKey) => {
    midnight.setNetworkKey(k)
    if (walletStatus === 'local-demo' && k !== 'local') {
      midnight.disconnect()
    }
  }

  const openConnect = () => {
    setDrawer('settings')
    flashUi('tap')
  }

  const startLocalDemo = () => {
    midnight.enableLocalDemo(api.localAddress)
    const addr = midnight.wallet.address
    if (addr) api.setLocalAddress(addr)
    flashUi('ok')
  }

  const gatedCreate = (...args: Parameters<typeof api.createGame>) => {
    if (!playAllowed) {
      openConnect()
      return
    }
    api.createGame(...args)
  }

  const gatedJoinListing = (...args: Parameters<typeof api.joinListing>) => {
    if (!playAllowed) {
      openConnect()
      return
    }
    api.joinListing(...args)
  }

  const gatedJoinByCode = (...args: Parameters<typeof api.joinByCode>) => {
    if (!playAllowed) {
      openConnect()
      return false
    }
    return api.joinByCode(...args)
  }

  return (
    <>
      <div className="noise" aria-hidden />
      <SvgDefs />

      <WelcomeScreen
        hidden={welcomeHidden}
        networkLabel={welcomeNet}
        networkKey={midnight.networkKey}
        onNetworkChange={handleNetworkChange}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onEnter={() => {
          setWelcomeHidden(true)
          flashUi('ok')
        }}
        onHowTo={() => {
          setWelcomeHidden(true)
          setRulesOpen(true)
        }}
        requirementsHint={
          isLiveNetwork(midnight.networkKey)
            ? 'Live play requires Lace or 1AM · proof server :6300 · faucet. Offline demo only on LOCAL.'
            : 'Local offline demo playable without a wallet. Switch to Preprod for live Wave 1.'
        }
      />

      {!welcomeHidden && <div style={{ height: '100vh' }} aria-hidden />}

      {welcomeHidden && (
        <>
          <Topbar
            networkPill={pill}
            networkKey={midnight.networkKey}
            onNetworkChange={handleNetworkChange}
            demoMode={offlineSim}
            activeTab={lobbyTab}
            myCount={myCount}
            directCount={directCount}
            stash={stashDisplay.value}
            stashKind={stashDisplay.kind}
            walletLabel={walletLabel}
            soundOn={soundOn}
            onToggleSound={toggleSound}
            onBrandClick={() => {
              if (inRoom) api.leaveToLobby()
              setLobbyTab('floor')
            }}
            onTab={(tab) => {
              if (inRoom) api.leaveToLobby()
              setLobbyTab(tab)
            }}
            onWallet={openConnect}
          />

          <main>
            {!inRoom ? (
              <Lobby
                active
                activeTab={lobbyTab}
                onTab={setLobbyTab}
                onCreate={gatedCreate}
                onJoinListing={gatedJoinListing}
                onJoinByCode={gatedJoinByCode}
                openListings={api.openListings}
                onRefreshListings={api.refreshLobby}
                localAddress={api.localAddress}
                historyTick={api.historyTick}
                notice={api.notice}
                networkLabel={pill}
                networkKey={midnight.networkKey}
                onNetworkChange={handleNetworkChange}
                playAllowed={playAllowed}
                playBlockedReason={blockedReason}
                onConnectWallet={openConnect}
                offlineSimulation={offlineSim}
              />
            ) : (
              <Room
                api={api}
                playAllowed={playAllowed}
                playBlockedReason={blockedReason}
                onConnectWallet={openConnect}
                offlineSimulation={offlineSim}
              />
            )}
          </main>

          <div className="global-dock" id="globalDock" hidden={inRoom}>
            <button
              className={`dock-item${drawer === 'settings' ? ' active' : ''}`}
              type="button"
              onClick={() => setDrawer(drawer === 'settings' ? null : 'settings')}
            >
              ⚙ <span>SETTINGS</span>
            </button>
            <button
              className={`dock-item${drawer === 'history' ? ' active' : ''}`}
              type="button"
              onClick={() => setDrawer(drawer === 'history' ? null : 'history')}
            >
              ◷ <span>HISTORY</span>
            </button>
          </div>

          <div
            className={`modal-backdrop${drawer || rulesOpen ? ' show' : ''}`}
            onClick={() => {
              closeDrawer()
              setRulesOpen(false)
            }}
            aria-hidden
          />

          <section className={`drawer-panel${drawer === 'settings' ? ' open' : ''}`} id="settingsPanel">
            <button className="drawer-close" type="button" onClick={closeDrawer}>
              ×
            </button>
            <div className="eyebrow">PREFERENCES</div>
            <h2>GAME SETTINGS</h2>
            <p className="drawer-lead">
              Sound, network, and Midnight connection. <b>Preprod / Preview</b> require a connected
              Lace or 1AM wallet for gameplay. Offline local demo only works on <b>LOCAL</b>.
            </p>
            <label className="setting-row">
              Master sound
              <input
                type="checkbox"
                checked={soundOn}
                onChange={toggleSound}
              />
            </label>
            <label className="setting-row">
              Local demo (offline)
              <button
                className="text-button"
                type="button"
                onClick={startLocalDemo}
                title="Switches network to LOCAL and enables offline play"
              >
                ENABLE → LOCAL
              </button>
            </label>
            <div className="drawer-connection-block">
              <div className="drawer-section-label">MIDNIGHT CONNECTION</div>
              <p className="drawer-section-hint">
                Network, Lace / 1AM wallet, stack health, and deploy tools.
              </p>
              <ConnectionPanel
                snapshot={midnight.snapshot}
                probing={midnight.probing}
                errorNote={midnight.errorNote}
                detectedWallets={midnight.wallet.detectedWallets}
                networkKey={midnight.networkKey}
                onNetworkChange={handleNetworkChange}
                onConnect={(key) => void midnight.connect(key)}
                onDisconnect={() => midnight.disconnect()}
                onLocalDemo={startLocalDemo}
                onProbe={() => void midnight.probe()}
                onRefreshInjection={() => {
                  void midnight.wallet.refreshInjection().then(() => midnight.refreshWalletView())
                }}
                deployState={midnight.deployState}
                busyAction={midnight.busyAction}
                onDeploy={() => void midnight.deploy()}
                onSmokeCall={() => void midnight.callCircuit('cancelOpenGame', [])}
                knownContractAddress={midnight.knownContractAddress}
              />
            </div>
          </section>

          <section className={`drawer-panel${drawer === 'history' ? ' open' : ''}`} id="historyPanel">
            <button className="drawer-close" type="button" onClick={closeDrawer}>
              ×
            </button>
            <div className="eyebrow">THIS BROWSER</div>
            <h2>MATCH HISTORY</h2>
            <p className="drawer-lead">Settled, cancelled, and forfeited local tables.</p>
            <MatchHistoryPanel refreshKey={api.historyTick} />
          </section>

          <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
        </>
      )}

      <audio id="backgroundMusic" src="/audio/carrot-box-scheme.mp3" loop preload="metadata" muted={!soundOn} />
    </>
  )
}
