/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIDNIGHT_NETWORK?: 'local' | 'preview'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
