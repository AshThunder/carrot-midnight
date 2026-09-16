import type { ConnectionSnapshot } from '@/midnight/connection'
import type { DetectedWallet } from '@/midnight/dappConnector'
import type { DeployServiceState } from '@/midnight/deployService'

function StatusDot({ ok }: { ok: boolean }) {
  return <i className={`conn-dot${ok ? ' ok' : ''}`} aria-hidden />
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
  const localDemoOn = snapshot.walletStatus === 'local-demo'

  return (
    <div className="connection-skin">
      <div className={`local-demo-callout${localDemoOn ? ' is-active' : ''}`}>
        <b>LOCAL DEMO</b>
        <p>
          Play the full table in this browser: Welcome → Lobby → Room. Dual-ledger privacy copy
          stays in the rules; a Midnight wallet is optional.
        </p>
        {localDemoOn ? (
          <span className="status-live">● YOU ARE IN LOCAL DEMO</span>
        ) : (
          <button className="primary" type="button" onClick={onLocalDemo}>
            PLAY LOCAL DEMO
          </button>
        )}
      </div>
      <div className="conn-toolbar">
        <button className="text-button" type="button" onClick={onProbe} disabled={probing}>
          {probing ? 'PROBING…' : 'RE-PROBE STACK'}
        </button>
        <button className="text-button" type="button" onClick={onRefreshInjection}>
          RESCAN WALLETS
        </button>
      </div>

      <div className="conn-grid">
        <div className="wallet-box">
          <span>NETWORK</span>
          <div className="conn-net-toggle">
            <button
              type="button"
              className={networkKey === 'local' ? 'active' : undefined}
              onClick={() => onNetworkChange('local')}
            >
              LOCAL
            </button>
            <button
              type="button"
              className={networkKey === 'preview' ? 'active' : undefined}
              onClick={() => onNetworkChange('preview')}
            >
              PREVIEW
            </button>
          </div>
          <b>{snapshot.network.label}</b>
          <small className="mono">{snapshot.network.networkId}</small>
        </div>

        <div className="wallet-box">
          <span>WALLET</span>
          <b>
            {snapshot.walletStatus}
            {snapshot.walletBrand ? ` · ${snapshot.walletBrand}` : ''}
          </b>
          <small>{snapshot.walletLabel}</small>
          {snapshot.walletAddress && (
            <small className="mono accent" title={snapshot.walletAddress}>
              {snapshot.walletAddress}
            </small>
          )}
          <small>
            Injection: {snapshot.injectionStatus}
            {detectedWallets.length > 0
              ? ` · ${detectedWallets.map((w) => w.displayName).join(', ')}`
              : ''}
          </small>
          <div className="conn-actions">
            {!walletConnected && (
              <>
                <button className="primary" type="button" onClick={() => onConnect()}>
                  CONNECT WALLET
                </button>
                <button className="secondary" type="button" onClick={onLocalDemo}>
                  LOCAL DEMO
                </button>
              </>
            )}
            {walletConnected && (
              <button className="secondary" type="button" onClick={onDisconnect}>
                DISCONNECT
              </button>
            )}
            {detectedWallets.length > 1 &&
              !walletConnected &&
              detectedWallets.map((w) => (
                <button
                  key={w.key}
                  className="text-button"
                  type="button"
                  onClick={() => onConnect(w.key)}
                  title={w.key}
                >
                  {w.displayName.toUpperCase()}
                </button>
              ))}
          </div>
        </div>
      </div>

      <div className="wallet-box">
        <span>STACK HEALTH</span>
        <ul className="conn-health">
          <li>
            <StatusDot ok={health?.proofServerReady ?? false} />
            <span>Proof server</span>
            <small className="mono">{health?.proofServer.detail ?? '—'}</small>
          </li>
          <li>
            <StatusDot ok={health?.indexerReady ?? false} />
            <span>Indexer</span>
            <small className="mono">{health?.indexer.detail ?? '—'}</small>
          </li>
          <li>
            <StatusDot ok={health?.nodeReady ?? false} />
            <span>Node</span>
            <small className="mono">{health?.node.detail ?? '—'}</small>
          </li>
          <li>
            <StatusDot ok={snapshot.plan?.packagesPresent ?? false} />
            <span>midnight-js packages</span>
            <small className="mono">
              {snapshot.plan?.packagesPresent ? '4.1.1 resolvable' : 'not installed'}
            </small>
          </li>
        </ul>
        <small>Mode: {snapshot.plan?.mode ?? '…'} · Local demo playable: yes</small>
      </div>

      <div className="wallet-box dashed">
        <span>DEPLOY / CALL</span>
        <b className={snapshot.canDeploy ? 'ready' : 'blocked'}>
          {snapshot.canDeploy ? 'Ready (wallet + stack + packages)' : 'Disabled'}
        </b>
        <div className="conn-actions">
          <button
            className="primary"
            type="button"
            disabled={!snapshot.canDeploy || busyAction !== null}
            onClick={onDeploy}
            title={
              snapshot.canDeploy
                ? 'deployContract(carrot-game)'
                : (snapshot.disabledReasons[0] ?? 'Not ready')
            }
          >
            {busyAction === 'deploy'
              ? 'DEPLOYING…'
              : deployState.status === 'deployed'
                ? 'RE-DEPLOY'
                : 'DEPLOY CONTRACT'}
          </button>
          <button
            className="secondary"
            type="button"
            disabled={
              !snapshot.canCall || !deployState.contractAddress || busyAction !== null
            }
            onClick={onSmokeCall}
            title={
              deployState.contractAddress
                ? 'submitCallTx cancelOpenGame (smoke)'
                : 'Deploy first'
            }
          >
            {busyAction === 'call' ? 'CALLING…' : 'SMOKE CALL'}
          </button>
        </div>
        {deployState.contractAddress && (
          <small className="mono accent" title={deployState.contractAddress}>
            Contract: {deployState.contractAddress}
          </small>
        )}
        {deployState.lastTxId && (
          <small className="mono" title={deployState.lastTxId}>
            Last tx: {deployState.lastTxId}
          </small>
        )}
        {!snapshot.canDeploy && (
          <ul className="conn-reasons">
            {snapshot.disabledReasons.slice(0, 6).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {errorNote && <p className="conn-error">{errorNote}</p>}
      </div>
    </div>
  )
}
