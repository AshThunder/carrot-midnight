import { describe, expect, it } from 'vitest'
import {
  PREPROD_CONTRACT_ADDRESS,
  PREPROD_DEPLOY_TX_ID,
  defaultNetworkKey,
  knownContractForNetwork,
  parseNetworkKey,
} from './knownContracts'
import { getConfig } from './config'

describe('knownContracts + preprod config', () => {
  it('exposes Wave 1 Preprod contract address', () => {
    expect(PREPROD_CONTRACT_ADDRESS).toBe(
      '0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15',
    )
    expect(PREPROD_DEPLOY_TX_ID).toMatch(/^0098c5f5/)
    expect(knownContractForNetwork('preprod')).toBe(PREPROD_CONTRACT_ADDRESS)
    expect(knownContractForNetwork('local')).toBeUndefined()
  })

  it('parses network keys including preprod', () => {
    expect(parseNetworkKey('preprod')).toBe('preprod')
    expect(parseNetworkKey('nope', 'local')).toBe('local')
    expect(parseNetworkKey('nope')).toBe('preprod')
    expect(typeof defaultNetworkKey()).toBe('string')
  })

  it('defaults to preprod when env unset / invalid', () => {
    // Without VITE_MIDNIGHT_NETWORK in test env, fallback is preprod
    expect(defaultNetworkKey()).toBe('preprod')
    expect(getConfig().networkId).toBe('preprod')
  })

  it('preprod faucetUi points at faucet.preprod.midnight.network', () => {
    expect(getConfig('preprod').faucetUi).toBe('https://faucet.preprod.midnight.network/')
    expect(getConfig('preview').faucetUi).toBe('https://faucet.preview.midnight.network/')
  })
})
