# Wave progress — Carrot Midnight

**Updated:** 2026-09-16 (WAT / Africa/Lagos)  
**Current pass:** **W0.5**

| Wave | Status | Delivered |
|------|--------|-----------|
| W0–W0.3 | Done | Compact 9 circuits, domain model, React/GSAP UI, DApp connector, midnight-js 4.1.1 deploy/call gates |
| W0.4 | Done | Room UX depth, deadline/forfeit, result modal, match history/leaderboard, docs |
| **W0.5** | **This pass** | Shareable `?game=` / join-code invites (BroadcastChannel + localStorage), fairness explainer panel, submission pack, result choreography polish, `npm run check` |
| W1 | Blocked | Live deploy/call smoke — needs Docker daemon + Lace/1AM on host |
| W2 | Planned | Escrow / token pot, on-chain lobby index |
| W3 | Planned | On-ledger chat transport, spectating, demo video |

## Offline-first (no Docker pretence)

- Local demo is fully playable: lobby, multi-tab invite sync, peek, Keep/Swap, settle, forfeit, chat hashes, history.
- `npm run compile` / `test` / `lint` / `build` / **`check`** stay green without a proof stack.
- Connection panel surfaces honest disable reasons when stack/wallet are unavailable.

## Evidence

- Compiling Compact (`contracts/carrot-game.compact` → `contracts/managed/`)
- Domain + chat + invite/session tests under `src/`
- Pitch + demo script in `docs/`; Akindo checklist in `submission/AKINDO_CHECKLIST.md`
