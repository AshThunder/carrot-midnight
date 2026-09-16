# Carrot Midnight

**Private two-player bluffing** inspired by “carrot in a box,” built for **Midnight Network** dual-ledger + ZK (Compact).

Package: `carrot-midnight` · License: **Apache-2.0** · Theme: carrots, boxes, privacy.

- **GitHub:** https://github.com/AshThunder/carrot-midnight
- **Live:** https://carrot-midnight.vercel.app
- **GitHub topic:** `midnightntwrk`

## Gameflow

1. **Player A** creates an **open** or **direct** challenge with a wager (listed on the local lobby floor).
2. Carrot location ∈ `{1,2}` is sampled **privately**; a **commitment** is written to the public ledger. Player A may **peek** via private state only.
3. **Player B** accepts with a matching wager → **decision window** starts (≥ 1 hour).
4. Optional **encrypted chat** for bluffing (AES-GCM client-side; ciphertext hash ready for Compact `postChatCiphertext`).
5. Player B **Keep** or **Swap** (no peek) → **revealing** phase.
6. **Settle**: open commitment, apply winner math, award pot. **Timeout** (pre-decision) forfeits to A. Creator may **cancel** while still waiting.

## Privacy / fairness model

Midnight dual-ledger **commit–reveal** design that fits Compact:

| Step | Private (witness / local) | Public ledger |
|------|---------------------------|---------------|
| Create | `carrotLocation`, `carrotSalt` | `carrotCommitment = persistentHash(domain, salt, loc)` |
| Peek | Local private state only | Nothing disclosed |
| Decision | — | `swapped` boolean; phase → `revealing` |
| Chat | AES-GCM plaintext | Optional `lastChatCipherHash` + `chatCount` |
| Settle | Re-supply location + salt as witnesses | Verify commitment; `disclose` location + winner |

- **Binding**: cannot change location after create without failing settle.
- **Hiding**: 256-bit salt + domain-separated `persistentHash`.
- **`disclose()`** only for intentional public outputs.
- Timeout / cancel paths never require opening the carrot commitment.

See `contracts/carrot-game.compact` and `src/domain/settlement.ts`.

## Architecture

```
contracts/carrot-game.compact   # 9 circuits (phases, commit, chat hash, settle)
contracts/managed/              # Compiler output (keys, zkir, TS)
src/domain/                     # Pure game + winner + lobby + match history + tests
src/components/                 # Welcome, Lobby, Room, ResultModal, MatchHistory, Connection drawers
src/chat/                       # AES-GCM + ciphertext hash helpers
src/midnight/                   # Config, DApp Connector, stack health, provider plan/stubs
compose.yml                     # Local proof-server / indexer / node (needs Docker)
docs/DOCKER.md                  # Rootless / static Docker notes for this box
submission/                     # Wave progress, short architecture, Akindo checklist
```

## Toolchain

```bash
source "$HOME/.local/bin/env"
# Prefers Node 22.14.0 from ~/.local/node if installed
# Compact 0.34.0 via scripts/compile-compact.sh
node -v   # expect ≥ 22
```

## Setup

```bash
cd /workspace/midnight-carrot
npm install
npm run compile          # or: npm run compile:skip-zk
npm run test             # domain + midnight + history + invite tests
npm run lint
npm run build
npm run compile
npm run check            # test + lint + build + compile
npm run dev              # Vite UI on :5173
```

Local demo is **fully playable** without a wallet extension or Docker. Use **Demo wallet** / Connection panel → Local demo.

**Multi-tab invite:** after create, copy the room link (`?game=` / join code) into another tab — sync uses `localStorage` + BroadcastChannel (same origin).

### Wallet (DApp Connector)

- Detects Lace / 1AM (and any CAIP-372 injector) via `window.midnight`
- Connect / disconnect in the header and Connection panel
- Falls back cleanly when no extension is present

### Local Midnight stack (optional — Docker required)

See `docs/DOCKER.md`. On this box, rootless Docker needs `newuidmap` (not installable without root). When a daemon is available:

```bash
npm run env:up           # proof-server :6300, indexer :8088, node :9944
# Connection panel re-probe should flip stack health green
# then Deploy / Smoke call from Connection panel when Ready
npm run env:down
```

### Preview network

Set `VITE_MIDNIGHT_NETWORK=preview` (see `.env.example`) or use the Connection panel toggle. Endpoints are configured; deploy/prove still needs W1 wallet + proof path.

## Compile

```bash
bash scripts/compile-compact.sh
```

Expected: **9 circuits** (create/accept/cancel/decide/chat/settle/forfeit).

## Midnight integration (Wave roadmap)

| Wave | Status | Scope |
|------|--------|-------|
| **W0** | Done | Compact compiles; domain tests; React+GSAP shell |
| **W0.1** | Done | Reveal phase, lobby store, encrypted chat E2E local, deeper stubs, GSAP polish |
| **W0.2** | Done | DApp Connector patterns, Connection panel, provider plan + stack probes |
| **W0.3** | Done | midnight-js 4.1.1, real providers, deploy/call service + UI gates |
| **W0.5** | Done | Invites, submission pack, `check` |
| **W1-prep** | **Current** | UI polish, Preview wallet/faucet/deploy scripts, live-stack docs |
| **W1** | Next | Docker stack live + Lace/1AM deploy/call smoke |
| **W2** | Planned | Escrow/token pot, multi-game lobby index |
| **W3** | Planned | Chat persistence on-ledger, spectating, demo video |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run compile` | Full Compact compile + proving keys |
| `npm run compile:skip-zk` | Faster TS/zkir without keys |
| `npm run test` | Vitest — 45 tests (domain, history, chat, midnight) |
| `npm run lint` | `tsc --noEmit` |
| `npm run build` | Production Vite build |
| `npm run dev` | Vite React UI |
| `npm run env:up` / `env:down` | Docker Undeployed stack (WaveHack primary) |
| `npm run deploy:local` | Genesis-wallet deploy + smoke on Undeployed |
| `npm run test:local` | Vitest + deploy:local when stack is up |
| `npm run preview:*` | Optional Preview testnet helpers (secondary) |

## Docs

- `docs/PITCH.md` — product pitch (matches current offline-first product)
- `docs/DEMO_SCRIPT.md` — live demo flow (~3–4 min)
- `docs/DOCKER.md` — Docker/rootless status on this box
- `docs/LIVE_STACK.md` — Preview (no local node Docker) + local compose paths
- `submission/LIVE_DEMO.md` — judge/self runbook
- `STATUS.md` — blockers and what’s stubbed
- `CONTRIBUTING.md` — PR checks + GitHub topic **`midnightntwrk`** when published

## Screenshots (capture for README / pitch)

Add PNGs under `docs/screenshots/` when recording (filenames suggested):

| File | What to capture |
|------|-----------------|
| `01-lobby.png` | Lobby with wager presets, pot preview, open-games floor |
| `02-room-roles.png` | Room with Player A/B seats, pot strip, hinged boxes closed |
| `03-peek.png` | Player A private peek — lid hinged, carrot visible |
| `04-deadline-chat.png` | Decision window: countdown bar + encrypted chat |
| `05-result-modal.png` | Settle result modal — boxes open, winner + pot |
| `06-history.png` | Match history + local leaderboard on lobby |
| `07-connection.png` | Connection panel showing stack probes / deploy gates |

Until images exist, the table above is the shot list for demos and README embeds:

```markdown
![Lobby](docs/screenshots/01-lobby.png)
```


## Security notes

- Circuit arguments are public transcript — **never** pass location as a circuit argument.
- Domain separators: `carrot-midnight:pk:v1`, `carrot-midnight:loc:v1`.
- Assert all witness outputs (`location ∈ {1,2}`, commitment match) before ledger writes.
- Chat plaintext never goes on-ledger; only ciphertext hashes via `postChatCiphertext`.
