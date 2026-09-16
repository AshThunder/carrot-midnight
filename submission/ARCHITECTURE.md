# Architecture (short) — Carrot Midnight

## Dual-ledger game

| Layer | Responsibility |
|-------|----------------|
| **Compact** (`carrot-game.compact`) | 9 circuits: create / accept / cancel / decide / chat ciphertext hash / settle / forfeit. Public: phase, wager, commitment, decision. Private witnesses: location + salt until settle `disclose()`. |
| **Domain** (`src/domain/`) | Pure TS mirror of phases, deadlines, winner math, lobby floor, match history, invite codes, multi-tab session sync. |
| **UI** (`src/components/`) | Welcome → Lobby → Room (game.css skin), ConnectionPanel + MatchHistoryPanel drawers, Box3d + ResultModal, encrypted ChatPanel. |
| **Midnight JS** (`src/midnight/`) | Network config (local / preview / preprod), DApp Connector, stack health probes, provider plan, deploy/call service **gated** until Ready. |
| **Preview scripts** (`scripts/preview-*.mjs`) | Docker-free wallet seed, faucet drip attempt, deploy/smoke against public endpoints + ProofStation. |

## Local multi-tab invite

1. Create writes a **synced session** to `localStorage` and sets `?game=<id>&join=<code>` via `history.replaceState`.
2. Second tab opens the link (or pastes the join code) → seat **B** in `sessionStorage`.
3. Mutations publish via **BroadcastChannel** + `storage` events so both tabs share phase/decision/settle.

Same-origin only; no network transport claimed.

## Fairness (Midnight-native)

**Commit** → public hash at create · **Peek** → private state only · **Selective disclose** → witnesses verified in-circuit at settle. Explained in Rules modal + README.

## Toolchain

Node ≥ 22 · Compact 0.34 · midnight-js 4.1.1 · Vite + `vite-plugin-wasm` · Apache-2.0 · GitHub topic `midnightntwrk` when published.
