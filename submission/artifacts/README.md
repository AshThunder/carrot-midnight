# Deploy artifacts

| File | Path |
|------|------|
| **Primary** | `deploy-local.json` — from `npm run deploy:local` on Undeployed |
| Secondary | `deploy-preview.json` / `faucet-preview.json` / `wallet-preview.json` — optional Preview attempts |

Seeds for Preview (if any) stay in `.preview-wallet/` (gitignored). Genesis seed for local is the well-known `…0001` (not secret on undeployed).
