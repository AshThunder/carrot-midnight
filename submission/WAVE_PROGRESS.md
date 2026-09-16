# Wave progress — Carrot Midnight

**Updated:** 2026-09-16 (WAT / Africa/Lagos)  
**Current pass:** **W1-prep** — UI polish + **local Undeployed deploy scripts** (Docker blocked on agent box; ready on Mac)

| Wave | Status | Delivered |
|------|--------|-----------|
| W0–W0.3 | Done | Compact 9 circuits, domain, React UI, DApp connector, midnight-js 4.1.1 gates |
| W0.4–W0.5 | Done | Room UX, invites/multi-tab, submission pack, `npm run check` |
| **W1-prep** | **This pass** | Welcome→Lobby→Room polish; Connection/History skins; sound mute; join-code HUD; `deploy:local` / `test:local` (genesis); LIVE_STACK local-first; Preview scripts kept secondary |
| W1 | Ready when Docker up | `npm run env:up` → `deploy:local` smoke on Undeployed |
| W2+ | Planned | Escrow, lobby index, on-ledger chat |

## WaveHack alignment

- Hard gate: **compiling Compact** + public GitHub + `midnightntwrk` + Apache-2.0 + README/demo — **satisfied offline**.
- Live txs: **local Undeployed** (genesis, no faucet), not mandatory Preview.

## Blockers (honest)

- Agent box: Docker rootless fails (overlay/iptables) — Mac Docker Desktop runs `env:up` + `deploy:local`.
