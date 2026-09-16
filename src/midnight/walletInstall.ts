/**
 * Official desktop install links for Midnight-compatible wallets (Lace, 1AM).
 * Chrome Web Store URLs work for Chromium browsers (Chrome, Edge, Brave, Opera).
 */

export const WALLET_INSTALL = {
  laceChrome:
    'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk',
  laceFirefox: 'https://addons.mozilla.org/firefox/addon/lace-wallet/',
  laceSite: 'https://www.lace.io/',
  oneAmChrome:
    'https://chromewebstore.google.com/detail/1am/bphnkdkcnfhompoegfpgnkidcjfbojjp',
  oneAmSite: 'https://1am.xyz/',
} as const

function readUa(ua?: string): string {
  if (ua != null) return ua
  if (typeof navigator !== 'undefined' && navigator.userAgent) return navigator.userAgent
  return ''
}

/** True when UA looks like Firefox (not Seamonkey). */
export function isFirefoxUa(ua?: string): boolean {
  const s = readUa(ua)
  return /firefox/i.test(s) && !/seamonkey/i.test(s)
}

/** Lace store link for the current (or given) browser UA. Defaults to Chrome Web Store. */
export function laceInstallUrl(ua?: string): string {
  return isFirefoxUa(ua) ? WALLET_INSTALL.laceFirefox : WALLET_INSTALL.laceChrome
}

/** 1AM currently ships via Chrome Web Store (Chromium). */
export function oneAmInstallUrl(_ua?: string): string {
  return WALLET_INSTALL.oneAmChrome
}

export function walletInstallLinks(ua?: string): {
  lace: string
  oneAm: string
  laceSite: string
  oneAmSite: string
} {
  return {
    lace: laceInstallUrl(ua),
    oneAm: oneAmInstallUrl(ua),
    laceSite: WALLET_INSTALL.laceSite,
    oneAmSite: WALLET_INSTALL.oneAmSite,
  }
}
