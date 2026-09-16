import { describe, expect, it } from 'vitest'
import {
  allowsOfflineSimulation,
  canPerformGameplay,
  gameplayBlockedReason,
  isLiveNetwork,
  isOfflineSimulationMode,
  networkModeLabel,
  welcomeNetworkLabel,
} from './playMode'

describe('playMode gating', () => {
  it('treats preprod and preview as live networks', () => {
    expect(isLiveNetwork('preprod')).toBe(true)
    expect(isLiveNetwork('preview')).toBe(true)
    expect(isLiveNetwork('local')).toBe(false)
  })

  it('allows offline simulation only on local', () => {
    expect(allowsOfflineSimulation('local')).toBe(true)
    expect(allowsOfflineSimulation('preprod')).toBe(false)
    expect(allowsOfflineSimulation('preview')).toBe(false)
  })

  it('blocks gameplay on Preprod/Preview without connected wallet', () => {
    for (const net of ['preprod', 'preview'] as const) {
      expect(canPerformGameplay(net, 'disconnected')).toBe(false)
      expect(canPerformGameplay(net, 'unavailable')).toBe(false)
      expect(canPerformGameplay(net, 'local-demo')).toBe(false)
      expect(canPerformGameplay(net, 'connecting')).toBe(false)
      expect(canPerformGameplay(net, 'connected')).toBe(true)
      expect(gameplayBlockedReason(net, 'disconnected')).toMatch(/Connect Lace/i)
      expect(gameplayBlockedReason(net, 'local-demo')).toMatch(/Local demo cannot/i)
    }
  })

  it('allows gameplay on local without a wallet (offline demo)', () => {
    expect(canPerformGameplay('local', 'disconnected')).toBe(true)
    expect(canPerformGameplay('local', 'unavailable')).toBe(true)
    expect(canPerformGameplay('local', 'local-demo')).toBe(true)
    expect(canPerformGameplay('local', 'connected')).toBe(true)
    expect(gameplayBlockedReason('local', 'disconnected')).toBeNull()
  })

  it('marks offline simulation mode only on local without connected wallet', () => {
    expect(isOfflineSimulationMode('local', 'local-demo')).toBe(true)
    expect(isOfflineSimulationMode('local', 'disconnected')).toBe(true)
    expect(isOfflineSimulationMode('local', 'connected')).toBe(false)
    expect(isOfflineSimulationMode('preprod', 'local-demo')).toBe(false)
    expect(isOfflineSimulationMode('preprod', 'connected')).toBe(false)
  })

  it('never labels Preprod as Local demo', () => {
    expect(networkModeLabel('preprod', 'disconnected')).toBe('Preprod')
    expect(networkModeLabel('preprod', 'local-demo')).toBe('Preprod')
    expect(networkModeLabel('local', 'local-demo')).toBe('Local demo')
    expect(welcomeNetworkLabel('preprod', 'local-demo')).toBe('Preprod · Midnight')
    expect(welcomeNetworkLabel('local', 'local-demo')).toBe('Local demo (offline)')
  })
})
