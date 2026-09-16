import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss(), wasm()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    exclude: [
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/midnight-js-node-zk-config-provider',
      '@midnight-ntwrk/midnight-js-contracts',
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Keep Node-only ZK loader out of browser graph when possible
      external: [],
    },
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()],
  },
})
