import type { ConnectionSnapshot } from '@/midnight/connection'
import type { DetectedWallet } from '@/midnight/dappConnector'
import type { DeployServiceState } from '@/midnight/deployService'
import type { NetworkKey } from '@/midnight/knownContracts'
import { PREPROD_CONTRACT_ADDRESS, PREPROD_DEPLOY_TX_ID } from '@/midnight/knownContracts'
import { WalletInstallCtas } from '@/components/WalletInstallCtas'

function StatusDot({ ok }: { ok: boolean }) {
  return <i className={`conn-dot${ok ? ' ok' : ''}`} aria-hidden />
}

function shortHex(h: string, n = 10): string {
  if (h.length <= n * 2 + 1) return h
  return `${h.slice(0, n)}…${h.slice(-n)}`
}

interface ConnectionPanelProps {
  snapshot: ConnectionSnapshot
  probing: boolean
  errorNote: string | null
  detectedWallets: DetectedWallet[]
  networkKey: NetworkKey
  onNetworkChange: (k: NetworkKey) => void
  onConnect: (walletKey?: string) => void
  onDisconnect: () => void
  onLocalDemo: () => void
  onProbe: () => void
  onRefreshInjection: () => void
  deployState: DeployServiceState
  busyAction: 'deploy' | 'call' | null
  onDeploy: () => void
  onSmokeCall: () => void
  knownContractAddress?: string
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
  knownContractAddress,
}: ConnectionPanelProps) {
  const health = snapshot.plan?.health
  const walletConnected =
    snapshot.walletStatus === 'connected' || snapshot.walletStatus === 'local-demo'
  const faucetUi = snapshot.network.faucetUi
  const displayedContract =
    deployState.contractAddress || knownContractAddress ||
    (networkKey === 'preprod' ? PREPROD_CONTRACT_ADDRESS : undefined)
  const displayedTx =
    deployState.lastTxId || (networkKey === 'preprod' ? PREPROD_DEPLOY_TX_ID : undefined)

  return (
    <div className="connection-skin">
      <div className="conn-toolbar">
        <button className="text-button" type="button" onClick={onProbe} disabled={probing}>
          {probing ? 'PROBING…' : 'RE-PROBE STACK'}
        </button>
        <button className="text-button" type="button" onClick={onRefreshInjection}>
          RESCAN WALLETS
        </button>
      </div>

      <div className="wallet-box">
        <span>REQUIREMENTS (LIVE)</span>
        <ul className="conn-reasons" style={{ marginTop: 8 }}>
          <li>
            Install <b>Lace</b> or <b>1AM</b> (Midnight DApp Connector) and set network to{' '}
            <b>{snapshot.network.networkId}</b>.
          </li>
          <li>
            Local proof server on <span className="mono">http://127.0.0.1:6300</span> for live prove
            (Docker <span className="mono">proof-server</span>).
          </li>
          {faucetUi && (
            <li>
              Fund via faucet:{' '}
              <a href={faucetUi} target="_blank" rel="noreferrer">
                {faucetUi}
              </a>
            </li>
          )}
          <li>
            Offline <b>Local demo</b> only on <b>LOCAL</b> (enabling it switches the network). Preprod/Preview
            gameplay requires a connected Lace/1AM wallet — no silent offline fallback.
          </li>
        </ul>
      </div>

      {detectedWallets.length === 0 && !walletConnected && (
        <WalletInstallCtas variant="card" />
      )}

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
            <button
              type="button"
              className={networkKey === 'preprod' ? 'active' : undefined}
              onClick={() => onNetworkChange('preprod')}
            >
              PREPROD
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
              : ' · install Lace or 1AM'}
          </small>
          <div className="conn-actions">
            {!walletConnected && (
              <>
                <button className="primary" type="button" onClick={() => onConnect()}>
                  CONNECT WALLET
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={onLocalDemo}
                  title="Switches network to LOCAL and enables offline play"
                >
                  LOCAL DEMO → LOCAL
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
        <small>
          Mode: {snapshot.plan?.mode ?? '…'} · Offline demo:{' '}
          {networkKey === 'local' ? 'allowed on LOCAL' : 'blocked on this network — connect wallet'}
        </small>
      </div>

      <div className="wallet-box dashed">
        <span>DEPLOY / CALL</span>
        <b className={snapshot.canDeploy ? 'ready' : 'blocked'}>
          {snapshot.canDeploy ? 'Ready (wallet + stack + packages)' : 'Disabled'}
        </b>
        {networkKey === 'preprod' && displayedContract && (
          <div className="conn-known-contract" style={{ marginTop: 10 }}>
            <small>Wave 1 Preprod contract (live)</small>
            <small className="mono accent" title={displayedContract}>
              {displayedContract}
            </small>
            {displayedTx && (
              <small className="mono" title={displayedTx}>
                Deploy tx: {shortHex(displayedTx)}
              </small>
            )}
          </div>
        )}
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
              : deployState.status === 'deployed' && deployState.handle
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
        {deployState.contractAddress && networkKey !== 'preprod' && (
          <small className="mono accent" title={deployState.contractAddress}>
            Contract: {deployState.contractAddress}
          </small>
        )}
        {deployState.lastTxId && networkKey !== 'preprod' && (
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
