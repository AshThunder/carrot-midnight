import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Badge } from '@/ui/badge'
import type { ConnectionSnapshot } from '@/midnight/connection'
import type { DetectedWallet } from '@/midnight/dappConnector'
import type { DeployServiceState } from '@/midnight/deployService'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-rose-400'}`}
      aria-hidden
    />
  )
}

interface ConnectionPanelProps {
  snapshot: ConnectionSnapshot
  probing: boolean
  errorNote: string | null
  detectedWallets: DetectedWallet[]
  networkKey: 'local' | 'preview'
  onNetworkChange: (k: 'local' | 'preview') => void
  onConnect: (walletKey?: string) => void
  onDisconnect: () => void
  onLocalDemo: () => void
  onProbe: () => void
  onRefreshInjection: () => void
  deployState: DeployServiceState
  busyAction: 'deploy' | 'call' | null
  onDeploy: () => void
  onSmokeCall: () => void
}

export function ConnectionPanel({
  snapshot,
  probing,
  errorNote,
  detectedWallets,
  networkKey,
  onNetworkChange,
  onConnect,
  onDisconnect,
  onLocalDemo,
  onProbe,
  onRefreshInjection,
  deployState,
  busyAction,
  onDeploy,
  onSmokeCall,
}: ConnectionPanelProps) {
  const health = snapshot.plan?.health
  const walletConnected =
    snapshot.walletStatus === 'connected' || snapshot.walletStatus === 'local-demo'

  return (
    <Card className="border-carrot/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Badge className="mb-2 w-fit">Connection</Badge>
            <CardTitle>Midnight stack · wallet</CardTitle>
            <CardDescription>
              Local demo stays playable without extension or Docker. Deploy/call light up when
              wallet + proof stack are ready.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={onProbe} disabled={probing}>
              {probing ? 'Probing…' : 'Re-probe stack'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onRefreshInjection}>
              Rescan wallets
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-midnight-border bg-midnight/40 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Network</p>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant={networkKey === 'local' ? 'default' : 'outline'}
                onClick={() => onNetworkChange('local')}
              >
                Local
              </Button>
              <Button
                size="sm"
                variant={networkKey === 'preview' ? 'default' : 'outline'}
                onClick={() => onNetworkChange('preview')}
              >
                Preview
              </Button>
            </div>
            <p className="mt-2 text-sm text-slate-300">{snapshot.network.label}</p>
            <p className="font-mono text-xs text-slate-500">{snapshot.network.networkId}</p>
          </div>

          <div className="rounded-xl border border-midnight-border bg-midnight/40 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-500">Wallet</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">
              {snapshot.walletStatus}
              {snapshot.walletBrand ? ` · ${snapshot.walletBrand}` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-400">{snapshot.walletLabel}</p>
            {snapshot.walletAddress && (
              <p className="mt-1 truncate font-mono text-xs text-carrot" title={snapshot.walletAddress}>
                {snapshot.walletAddress}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Injection: {snapshot.injectionStatus}
              {detectedWallets.length > 0
                ? ` · ${detectedWallets.map((w) => w.displayName).join(', ')}`
                : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!walletConnected && (
                <>
                  <Button size="sm" onClick={() => onConnect()}>
                    Connect wallet
                  </Button>
                  <Button size="sm" variant="secondary" onClick={onLocalDemo}>
                    Local demo
                  </Button>
                </>
              )}
              {walletConnected && (
                <Button size="sm" variant="outline" onClick={onDisconnect}>
                  Disconnect
                </Button>
              )}
              {detectedWallets.length > 1 &&
                !walletConnected &&
                detectedWallets.map((w) => (
                  <Button
                    key={w.key}
                    size="sm"
                    variant="ghost"
                    onClick={() => onConnect(w.key)}
                    title={w.key}
                  >
                    {w.displayName}
                  </Button>
                ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-midnight-border bg-midnight/40 p-3">
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">Stack health</p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <StatusDot ok={health?.proofServerReady ?? false} />
              <span>Proof server</span>
              <span className="truncate font-mono text-xs text-slate-500">
                {health?.proofServer.detail ?? '—'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot ok={health?.indexerReady ?? false} />
              <span>Indexer</span>
              <span className="truncate font-mono text-xs text-slate-500">
                {health?.indexer.detail ?? '—'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot ok={health?.nodeReady ?? false} />
              <span>Node</span>
              <span className="truncate font-mono text-xs text-slate-500">
                {health?.node.detail ?? '—'}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <StatusDot ok={snapshot.plan?.packagesPresent ?? false} />
              <span>midnight-js packages</span>
              <span className="font-mono text-xs text-slate-500">
                {snapshot.plan?.packagesPresent ? '4.1.1 resolvable' : 'not installed'}
              </span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Mode: {snapshot.plan?.mode ?? '…'} · Local demo playable: yes
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-midnight-border p-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">Deploy / call</p>
          <p className="mt-1 text-sm">
            {snapshot.canDeploy ? (
              <span className="text-emerald-300">Ready (wallet + stack + packages)</span>
            ) : (
              <span className="text-amber-200">Disabled</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!snapshot.canDeploy || busyAction !== null}
              onClick={onDeploy}
              title={
                snapshot.canDeploy
                  ? 'deployContract(carrot-game)'
                  : snapshot.disabledReasons[0] ?? 'Not ready'
              }
            >
              {busyAction === 'deploy'
                ? 'Deploying…'
                : deployState.status === 'deployed'
                  ? 'Re-deploy'
                  : 'Deploy contract'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={
                !snapshot.canCall ||
                !deployState.contractAddress ||
                busyAction !== null
              }
              onClick={onSmokeCall}
              title={
                deployState.contractAddress
                  ? 'submitCallTx cancelOpenGame (smoke)'
                  : 'Deploy first'
              }
            >
              {busyAction === 'call' ? 'Calling…' : 'Smoke call'}
            </Button>
          </div>
          {deployState.contractAddress && (
            <p className="mt-2 truncate font-mono text-xs text-carrot" title={deployState.contractAddress}>
              Contract: {deployState.contractAddress}
            </p>
          )}
          {deployState.lastTxId && (
            <p className="mt-1 truncate font-mono text-xs text-slate-400" title={deployState.lastTxId}>
              Last tx: {deployState.lastTxId}
            </p>
          )}
          {!snapshot.canDeploy && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
              {snapshot.disabledReasons.slice(0, 6).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
          {errorNote && (
            <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-100">
              {errorNote}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
