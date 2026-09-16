/**
 * Compatibility facade — real implementation lives in ./providers.ts (W0.3).
 * Prefer importing from '@/midnight/providers'.
 */
export {
  PROVIDERS_STUB_NOTE,
  MIDNIGHT_JS_PACKAGES,
  detectMidnightJsPackages,
  planProviderConstruction,
  tryBuildLiveProviders,
  buildLiveProviders,
  createProvidersStub,
  createDeployedHandleStub,
  assertProvidersReady,
  createConnectorWalletMidnightProviders,
  DEV_PRIVATE_STORAGE_PASSWORD,
  CARROT_PRIVATE_STATE_ID,
  type ProviderBuildMode,
  type ProviderConstructionPlan,
  type BuildProvidersOpts,
  type StackHealth,
} from './providers'
