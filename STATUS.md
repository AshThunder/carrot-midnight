# Carrot Midnight — Status

**Date:** 2026-09-16 (WAT / Africa/Lagos)  
**Pass:** W0.5 — shareable invites · fairness panel · submission pack · result choreography · `npm run check`

## Compile / test / build

✅ **`compactc` 0.34.0** — 9 circuits (`npm run compile`) · managed stamp `runtime-version: 0.19.0`  
✅ **`npm test`** — domain + chat + invite/session + match history + midnight gates  
✅ **`npm run lint`** (`tsc --noEmit`)  
✅ **`npm run build`** (Vite + `vite-plugin-wasm`)  
✅ **`npm run check`** — test + lint + build + compile

## Implemented this pass (W0.5)

- **Shareable room invites** — `?game=` / `?join=` URL + short join code; Lobby “Join with code”; Room InviteBar (copy link/code)
- **Multi-tab local demo** — `localStorage` session + **BroadcastChannel** / `storage` sync; per-tab seat in `sessionStorage`
- **Fairness explainer panel** — commitment · private peek · selective `disclose()` at settle (Midnight-native copy only)
- **Submission pack** — `submission/WAVE_PROGRESS.md`, `ARCHITECTURE.md`, `AKINDO_CHECKLIST.md`
- **ResultModal + HingedBox** — backdrop fade, staggered lid open, carrot spark/glow; reduced-motion still instant
- **`npm run check`** script

## Prior (W0.4) still in tree

- Richer room UX (seats, pot, deadline, forfeit, result modal)
- Match history + local leaderboard
- Docs: PITCH, DEMO_SCRIPT, CONTRIBUTING; topic `midnightntwrk` noted

## Stubbed / not live yet (needs Docker + Lace/1AM)

- On-chain deploy/call **execution** (code path ready; gated until `canDeploy`)
- Chat **network transport** (`postChatCiphertext` not submitted)
- On-chain lobby index
- Token/escrow pot (Zswap later)

## Blockers on this box

| Item | State | Impact |
|------|-------|--------|
| **Docker daemon** | Client present; cannot reach daemon (`/var/run/docker.sock`); rootless/`newuidmap` still insufficient for `env:up` | Cannot start proof/indexer/node → providers stay stub |
| **Lace / 1AM extension** | Not in this headless box | Connect falls back to local demo; deploy/call stay disabled |
| **Compact circuit simulator** | Not available as a compact unit-test harness here | Domain + hash + invite tests cover reveal/chat/sync instead |
| **Node.js** | **v22.14.0** via `$HOME/.local/bin/env` | Use before npm |

## Exact next steps — live stack (W1 finish)

1. Host with working Docker Engine (rootful or rootless with working `newuidmap`/`newgidmap` + subuid):
   ```bash
   source "$HOME/.local/bin/env"
   cd /workspace/midnight-carrot
   npm run env:up
   ```
2. Connection panel stack dots green → **Connect** Lace/1AM on Local (`undeployed`).
3. When **Ready**: **Deploy contract** → **Smoke call** (or lobby create/join against deployed address).
4. Optional: Preview network + faucet.

## How to run

```bash
source "$HOME/.local/bin/env"
cd /workspace/midnight-carrot
npm install
npm run check          # test + lint + build + compile
npm run dev
```

## Wave roadmap

| Wave | Status | Scope |
|------|--------|-------|
| **W0–W0.3** | Done | Compact, domain, React/GSAP, connector, midnight-js 4.1.1 deploy gates |
| **W0.4** | Done | Room UX depth, history/leaderboard, docs/CONTRIBUTING |
| **W0.5** | **This pass** | Invites/multi-tab, fairness panel, submission pack, choreography, `check` |
| **W1** | Blocked on Docker+Lace | Live deploy/call smoke |
| **W2** | Planned | Escrow/token pot, lobby index |
| **W3** | Planned | On-ledger chat, spectating, demo video |
