import { laceInstallUrl, oneAmInstallUrl, WALLET_INSTALL } from '@/midnight/walletInstall'

const BLANK = { target: '_blank' as const, rel: 'noopener noreferrer' }

interface WalletInstallCtasProps {
  /** Larger card layout with heading + hint (Connection panel). */
  variant?: 'card' | 'inline' | 'gate'
  className?: string
  /** Optional compatibility note (Cardano Lace / legacy injector). */
  compatibilityNote?: string | null
}

export function WalletInstallCtas({
  variant = 'inline',
  className,
  compatibilityNote = null,
}: WalletInstallCtasProps) {
  const lace = laceInstallUrl()
  const oneAm = oneAmInstallUrl()

  if (variant === 'card') {
    return (
      <div className={`wallet-box wallet-install-card${className ? ` ${className}` : ''}`}>
        <span>GET A MIDNIGHT WALLET</span>
        <b>1AM recommended · Lace optional</b>
        <p className="wallet-install-hint">
          {compatibilityNote ??
            'This app needs Midnight DApp Connector on window.midnight with connect(networkId). After install, enable the extension, Rescan wallets, and set the wallet network to Preprod.'}
        </p>
        <div className="conn-actions wallet-install-actions">
          <a className="primary" href={oneAm} {...BLANK}>
            Install 1AM (recommended)
          </a>
          <a className="secondary" href={lace} {...BLANK}>
            Install Lace
          </a>
        </div>
        <small className="wallet-install-sites">
          Sites:{' '}
          <a href={WALLET_INSTALL.oneAmSite} {...BLANK}>
            1am.xyz
          </a>
          {' · '}
          <a href={WALLET_INSTALL.laceSite} {...BLANK}>
            lace.io
          </a>
        </small>
      </div>
    )
  }

  return (
    <div
      className={`wallet-install-actions${variant === 'gate' ? ' gate' : ''}${className ? ` ${className}` : ''}`}
    >
      <a className="primary" href={oneAm} {...BLANK}>
        Install 1AM
      </a>
      <a className="secondary" href={lace} {...BLANK}>
        Install Lace
      </a>
    </div>
  )
}
