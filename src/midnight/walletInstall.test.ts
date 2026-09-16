import { describe, expect, it } from 'vitest'
import {
  WALLET_INSTALL,
  isFirefoxUa,
  laceInstallUrl,
  oneAmInstallUrl,
  walletInstallLinks,
} from './walletInstall'

describe('walletInstall', () => {
  it('exports official store and site URLs', () => {
    expect(WALLET_INSTALL.laceChrome).toContain('chromewebstore.google.com/detail/lace/')
    expect(WALLET_INSTALL.laceFirefox).toContain('addons.mozilla.org/firefox/addon/lace-wallet')
    expect(WALLET_INSTALL.oneAmChrome).toContain('chromewebstore.google.com/detail/1am/')
    expect(WALLET_INSTALL.laceSite).toBe('https://www.lace.io/')
    expect(WALLET_INSTALL.oneAmSite).toBe('https://1am.xyz/')
  })

  it('picks Firefox addon for Firefox UA and Chrome store otherwise', () => {
    expect(isFirefoxUa('Mozilla/5.0 Firefox/128.0')).toBe(true)
    expect(isFirefoxUa('Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36')).toBe(false)
    expect(isFirefoxUa('Mozilla/5.0 Edg/128.0.0.0')).toBe(false)
    expect(laceInstallUrl('Mozilla/5.0 Firefox/128.0')).toBe(WALLET_INSTALL.laceFirefox)
    expect(laceInstallUrl('Mozilla/5.0 Chrome/128.0')).toBe(WALLET_INSTALL.laceChrome)
    expect(laceInstallUrl('')).toBe(WALLET_INSTALL.laceChrome)
  })

  it('always returns 1AM Chrome store link', () => {
    expect(oneAmInstallUrl('Mozilla/5.0 Firefox/128.0')).toBe(WALLET_INSTALL.oneAmChrome)
    const links = walletInstallLinks('Mozilla/5.0 Firefox/120.0')
    expect(links.lace).toBe(WALLET_INSTALL.laceFirefox)
    expect(links.oneAm).toBe(WALLET_INSTALL.oneAmChrome)
  })
})
