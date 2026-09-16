# Architecture (short) — Carrot Midnight

## Dual-ledger game

| Layer | Responsibility |
|-------|----------------|
| **Compact** (`carrot-game.compact`) | 9 circuits: create / accept / cancel / decide / chat ciphertext hash / settle / forfeit. Public: phase, wager, commitment, decision. Private witnesses: location + salt until settle `disclose()`. |
| **Domain** (`src/domain/`) | Pure TS mirror of phases, deadlines, winner math, lobby floor, match history, invite codes, multi-tab session sync. |
| **UI** (`src/components/`) | Welcome → Lobby → Room (game.css skin), ConnectionPanel + MatchHistoryPanel drawers, Box3d + ResultModal, encrypted ChatPanel. |
| **Midnight JS** (`src/midnight/`) | Network config (local / preview / preprod), DApp Connector, stack health probes, provider plan, deploy/call service **gated** until Ready. |
| **Preprod / Preview scripts** (`scripts/preview-*.mjs`, `npm run preprod:*`) | Wallet seed (gitignored), faucet, deploy/smoke against public Preprod (primary) or Preview. |

## Local multi-tab invite

1. Create writes a **synced session** to `localStorage` and sets `?game=<id>&join=<code>` via `history.replaceState`.
2. Second tab opens the link (or pastes the join code) → seat **B** in `sessionStorage`.
3. Mutations publish via **BroadcastChannel** + `storage` events so both tabs share phase/decision/settle.

Same-origin only; no network transport claimed.

## Fairness (Midnight-native)

**Commit** → public hash at create · **Peek** → private state only · **Selective disclose** → witnesses verified in-circuit at settle. Explained in Rules modal + README.

## Toolchain

Node ≥ 22 · Compact **0.31.1** (Preprod ledger-v8) · midnight-js 4.1.1 · Vite + `vite-plugin-wasm` · Apache-2.0 · topic `midnightntwrk`.

Preprod contract: `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15`.
