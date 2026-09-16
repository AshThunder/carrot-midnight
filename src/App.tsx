import { useState } from 'react'
import { Lobby } from '@/components/Lobby'
import { Room } from '@/components/Room'
import { ConnectionPanel } from '@/components/ConnectionPanel'
import { MatchHistoryPanel } from '@/components/MatchHistoryPanel'
import { Button } from '@/ui/button'
import { useLocalGame } from '@/hooks/useLocalGame'
import { useMidnightConnection } from '@/hooks/useMidnightConnection'
import { isSoundEnabled, setSoundEnabled, flashUi } from '@/lib/uiFeedback'
import '@midnight-ntwrk/dapp-connector-api'

export function App() {
  const api = useLocalGame()
  const midnight = useMidnightConnection()
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())

  return (
    <div className="min-h-screen">
      <header className="border-b border-midnight-border/80 bg-midnight/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              🥕
            </span>
            <div>
              <p className="text-lg font-black tracking-tight">
                CARROT <em className="text-carrot not-italic">MIDNIGHT</em>
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Privacy · Boxes · Bluffs · {midnight.network.label}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {api.game && (
              <Button variant="ghost" size="sm" onClick={() => api.leaveToLobby()}>
                New lobby
              </Button>
            )}
            <Button
              variant={soundOn ? 'secondary' : 'ghost'}
              size="sm"
              title="Optional soft UI beeps (off by default)"
              onClick={() => {
                const next = !soundOn
                setSoundEnabled(next)
                setSoundOn(next)
                if (next) flashUi('tap')
              }}
            >
              Sound {soundOn ? 'on' : 'off'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                midnight.enableLocalDemo(api.localAddress)
                if (midnight.wallet.address) api.setLocalAddress(midnight.wallet.address)
              }}
              title="Enable local demo identity"
            >
              Demo wallet
            </Button>
            {midnight.snapshot.walletStatus === 'connected' ||
            midnight.snapshot.walletStatus === 'local-demo' ? (
              <Button variant="outline" size="sm" onClick={() => midnight.disconnect()}>
                Disconnect
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void midnight.connect()}
                title="DApp Connector — Lace / 1AM"
              >
                Connect
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-6">
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

      {!api.game ? (
        <>
          <Lobby
            onCreate={api.createGame}
            onJoinListing={api.joinListing}
            onJoinByCode={api.joinByCode}
            openListings={api.openListings}
            onRefreshListings={api.refreshLobby}
            walletStubLabel={midnight.wallet.label}
            localAddress={api.localAddress}
            onLocalAddressChange={api.setLocalAddress}
            statusBanner={{ tone: api.banner, text: api.notice }}
          />
          <MatchHistoryPanel refreshKey={api.historyTick} />
        </>
      ) : (
        <Room api={api} />
      )}

      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-500">
        Apache-2.0 · Compact ≥ 0.23 · 9 circuits · midnight-js 4.1.1 · decision ≥ 1h · reveal after
        Keep/Swap · topic <code className="text-slate-400">midnightntwrk</code>
      </footer>
    </div>
  )
}
