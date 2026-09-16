/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIDNIGHT_NETWORK?: 'local' | 'preview' | 'preprod'
  readonly VITE_CONTRACT_ADDRESS_PREPROD?: string
  readonly VITE_CONTRACT_TX_PREPROD?: string
  readonly VITE_CONTRACT_ADDRESS_PREVIEW?: string
  readonly VITE_CONTRACT_ADDRESS_LOCAL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
