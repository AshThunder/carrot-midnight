# Carrot Midnight — Status

**Date:** 2026-09-16 (WAT / Africa/Lagos)  
**Pass:** **Wave 1** — Preprod UI · live contract · **live-network play gating**

## Links

| | |
|--|--|
| GitHub | https://github.com/AshThunder/carrot-midnight |
| Live UI | https://carrot-midnight.vercel.app |
| Topic | `midnightntwrk` ✅ |
| Preprod contract | `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15` |
| Deploy tx | `0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a` |
| Artifact | `submission/artifacts/deploy-preprod.json` (+ `public/deploy-preprod.json`) |

## Compile / test / build

✅ **`compactc` 0.31.1** (ledger-v8 / Preprod protocol) — 9 circuits (`npm run compile`)  
✅ **`npm test`** / **`npm run lint`** / **`npm run build`**

## Wave 1 live story (correct)

**Primary:** **Preprod** public testnet — faucet → DUST → deploy evidence.

```bash
# Proof server for live prove
docker compose up -d proof-server   # :6300
# UI: Settings → PREPROD (or VITE_MIDNIGHT_NETWORK=preprod)
# Contract address shown in Connection panel
npm run preprod:wallet && npm run preprod:faucet -- --wait=600
npm run preprod:deploy              # → submission/artifacts/deploy-preprod.json
```

**Secondary:** Local Undeployed via Docker genesis (`npm run env:up` → `deploy:local`).

**UI:** Network toggle **LOCAL | PREVIEW | PREPROD**. On Preprod, Wave 1 contract address is visible without redeploying.

## Implemented this pass

- **Live-network gating:** Preprod/Preview require Lace/1AM `connected` for create/join/peek/decide/settle/chat; Local Demo forces **LOCAL** (no silent offline sim under a Preprod pill)
- Preprod network key in Connection panel + App pills / Welcome labels
- Known Preprod contract wired via env / `public/deploy-preprod.json` / `knownContracts.ts`
- Clearer Lace/1AM + proof-server :6300 + faucet requirements copy
- Submission docs + progress + pitch/demo runbooks updated for Preprod-primary

## Blockers / human steps remaining

| Item | State | Impact |
|------|-------|--------|
| **Demo video file** | Not in repo | User records (script ready: `docs/DEMO_SCRIPT.md`) |
| **Pitch PDF export** | `docs/PITCH.md` + `submission/PITCH_DECK.md` | Optional PDF for Akindo upload |
| **Akindo portal submit** | Human | After video / PDF |
| Lace / 1AM in headless agent | N/A | Judges use browser extension |
| Docker on this box | Rootless limits | Judges / Mac: Desktop OK |

## How to run

```bash
export PATH="$HOME/.local/node/node-v22.14.0-linux-x64/bin:$PATH"
cd /workspace/midnight-carrot
npm install && npm test && npm run lint && npm run build && npm run dev
```

Offline demo: Settings → **LOCAL DEMO → LOCAL** (or network toggle **LOCAL**). Preprod play: Connect Lace/1AM first.

## Wave roadmap

| Wave | Status | Scope |
|------|--------|-------|
| **W0–W0.5** | Done | Compact 9 circuits, domain, UI, invites, submission pack |
| **W1** | **Submission-ready** | Preprod UI + live deploy evidence + docs |
| **W2+** | Planned | Escrow, lobby index, on-ledger chat |
