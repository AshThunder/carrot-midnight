import { laceInstallUrl, oneAmInstallUrl, WALLET_INSTALL } from '@/midnight/walletInstall'

const BLANK = { target: '_blank' as const, rel: 'noopener noreferrer' }

interface WalletInstallCtasProps {
  /** Larger card layout with heading + hint (Connection panel). */
  variant?: 'card' | 'inline' | 'gate'
  className?: string
}

export function WalletInstallCtas({ variant = 'inline', className }: WalletInstallCtasProps) {
  const lace = laceInstallUrl()
  const oneAm = oneAmInstallUrl()

  if (variant === 'card') {
    return (
      <div className={`wallet-box wallet-install-card${className ? ` ${className}` : ''}`}>
        <span>GET A MIDNIGHT WALLET</span>
        <b>Install Lace or 1AM</b>
        <p className="wallet-install-hint">
          After install, refresh / Rescan wallets, then set wallet network to Preprod.
        </p>
        <div className="conn-actions wallet-install-actions">
          <a className="primary" href={lace} {...BLANK}>
            Install Lace
          </a>
          <a className="secondary" href={oneAm} {...BLANK}>
            Install 1AM
          </a>
        </div>
        <small className="wallet-install-sites">
          Sites:{' '}
          <a href={WALLET_INSTALL.laceSite} {...BLANK}>
            lace.io
          </a>
          {' · '}
          <a href={WALLET_INSTALL.oneAmSite} {...BLANK}>
            1am.xyz
          </a>
        </small>
      </div>
    )
  }

  return (
    <div
      className={`wallet-install-actions${variant === 'gate' ? ' gate' : ''}${className ? ` ${className}` : ''}`}
    >
      <a className="primary" href={lace} {...BLANK}>
        Install Lace
      </a>
      <a className="secondary" href={oneAm} {...BLANK}>
        Install 1AM
      </a>
    </div>
  )
}
