# Wave progress — Carrot Midnight

**Updated:** 2026-09-16 (WAT / Africa/Lagos)  
**Current pass:** **Wave 1 submission-ready**

**Preprod deploy:** `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15`  
**Deploy tx:** `0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a`

| Wave | Status | Delivered |
|------|--------|-----------|
| W0–W0.3 | Done | Compact 9 circuits, domain, React UI, DApp connector, midnight-js 4.1.1 gates |
| W0.4–W0.5 | Done | Room UX, invites/multi-tab, submission pack, `npm run check` |
| W1-prep | Done | Preprod scripts, faucet/DUST, deploy artifact |
| **W1** | **Submission-ready** | Preprod UI toggle + contract visible + docs/pitch/demo/progress |

## WaveHack alignment

- Hard gate: compiling Compact + public GitHub + `midnightntwrk` + Apache-2.0 + README/demo — **satisfied**.
- Live evidence: **Preprod** contract + tx in `submission/artifacts/deploy-preprod.json`.
- Remaining human: record demo video, optional pitch PDF, submit on Akindo.

## UI / judge notes

- Default live network via `VITE_MIDNIGHT_NETWORK=preprod` (see `.env.example`).
- Settings → **PREPROD** shows Wave 1 contract address.
- Requirements copy: Lace or 1AM · proof server `:6300` · Preprod faucet.
