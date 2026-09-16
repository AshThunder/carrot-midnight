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
import '@midnight-ntwrk/dapp-connector-api'

type DrawerId = 'settings' | 'history' | null

function networkPillLabel(networkKey: 'local' | 'preview', walletStatus: string): string {
  if (walletStatus === 'local-demo') return 'Local demo'
  if (networkKey === 'preview') return 'Preview'
  return 'Midnight'
}

function welcomeNetworkLabel(networkKey: 'local' | 'preview', walletStatus: string): string {
  if (walletStatus === 'local-demo') return 'Local demo'
  if (networkKey === 'preview') return 'Preview · Midnight'
  return 'Midnight'
}

export function App() {
  const api = useLocalGame()
  const midnight = useMidnightConnection()
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  const [welcomeHidden, setWelcomeHidden] = useState(false)
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('floor')
  const [drawer, setDrawer] = useState<DrawerId>(null)
  const [rulesOpen, setRulesOpen] = useState(false)

  const pill = networkPillLabel(midnight.networkKey, midnight.snapshot.walletStatus)
  const welcomeNet = welcomeNetworkLabel(midnight.networkKey, midnight.snapshot.walletStatus)

  const walletLabel = useMemo(() => {
    const addr = midnight.wallet.address || api.localAddress
    if (midnight.snapshot.walletStatus === 'local-demo') return `Demo · ${shortId(addr)}`
    if (midnight.snapshot.walletStatus === 'connected') return shortId(addr)
    return midnight.wallet.label || 'Connect'
  }, [
    midnight.wallet.address,
    midnight.wallet.label,
    midnight.snapshot.walletStatus,
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

  const [stash] = useState(() => getDemoStash())

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


  return (
    <>
      <div className="noise" aria-hidden />
      <SvgDefs />

      <WelcomeScreen
        hidden={welcomeHidden}
        networkLabel={welcomeNet}
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
      />

      {!welcomeHidden && <div style={{ height: '100vh' }} aria-hidden />}

      {welcomeHidden && (
        <>
          <Topbar
            networkPill={pill}
            activeTab={lobbyTab}
            myCount={myCount}
            directCount={directCount}
            stash={stash}
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
            onWallet={() => setDrawer('settings')}
          />

          <main>
            {!inRoom ? (
              <Lobby
                active
                activeTab={lobbyTab}
                onTab={setLobbyTab}
                onCreate={api.createGame}
                onJoinListing={api.joinListing}
                onJoinByCode={api.joinByCode}
                openListings={api.openListings}
                onRefreshListings={api.refreshLobby}
                localAddress={api.localAddress}
                historyTick={api.historyTick}
                notice={api.notice}
                networkLabel={pill}
              />
            ) : (
              <Room api={api} />
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
              Sound, network, and Midnight connection. Local demo stays playable without a wallet.
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
              Demo wallet
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  midnight.enableLocalDemo(api.localAddress)
                  if (midnight.wallet.address) api.setLocalAddress(midnight.wallet.address)
                  flashUi('ok')
                }}
              >
                ENABLE
              </button>
            </label>
            <div style={{ marginTop: 18 }}>
              <ConnectionPanel
                snapshot={midnight.snapshot}
                probing={midnight.probing}
                errorNote={midnight.errorNote}
                detectedWallets={midnight.wallet.detectedWallets}
                networkKey={midnight.networkKey}
                onNetworkChange={(k) => midnight.setNetworkKey(k)}
                onConnect={(key) => void midnight.connect(key)}
                onDisconnect={() => midnight.disconnect()}
                onLocalDemo={() => {
                  midnight.enableLocalDemo(api.localAddress)
                  if (midnight.wallet.address) api.setLocalAddress(midnight.wallet.address)
                }}
                onProbe={() => void midnight.probe()}
                onRefreshInjection={() => {
                  void midnight.wallet.refreshInjection().then(() => midnight.refreshWalletView())
                }}
                deployState={midnight.deployState}
                busyAction={midnight.busyAction}
                onDeploy={() => void midnight.deploy()}
                onSmokeCall={() => void midnight.callCircuit('cancelOpenGame', [])}
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
