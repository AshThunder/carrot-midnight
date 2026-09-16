# Carrot Midnight — Status

**Date:** 2026-09-16 (WAT / Africa/Lagos)  
**Pass:** W1-prep — UI polish · **local Undeployed deploy scripts** · submission pack

## Links

| | |
|--|--|
| GitHub | https://github.com/AshThunder/carrot-midnight |
| Live UI | https://carrot-midnight.vercel.app |
| Topic | `midnightntwrk` (add in GitHub settings if missing) |
| Local stack | `compose.yml` / [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev) |

## Compile / test / build

✅ **`compactc` 0.34.0** — 9 circuits (`npm run compile`)  
✅ **`npm test`** — 51 tests (domain + chat + invite + midnight gates)  
✅ **`npm run lint`** / **`npm run build`** / **`npm run check`**

## WaveHack deploy story (correct)

**Primary:** Local **Undeployed** via Docker — genesis wallet pre-funded, **no faucet**.

```bash
# Mac + Docker Desktop
npm run env:up
npm run deploy:local          # genesis seed …0001 → submission/artifacts/deploy-local.json
npm run test:local            # vitest + deploy smoke when stack up
```

**This box:** Docker daemon blocked (rootless overlay/iptables) → `deploy:local` / `test:local` probe fail with Mac instructions. Scripts ready for host with Docker.

**Secondary:** Preview scripts (`preview:wallet|faucet|deploy`) kept for optional public testnet — captcha blocks faucet API here.

## Implemented this pass

- UI: ConnectionPanel + MatchHistoryPanel game.css skin; sound mutes `<audio>` + beeps; demo stash; Room join-code HUD; dead chrome removed
- Flow docs: Welcome → Lobby → Room
- `scripts/deploy-local.mjs` + `npm run deploy:local` / `test:local`
- `docs/LIVE_STACK.md` (local first) · expanded `docs/DOCKER.md` · `submission/LIVE_DEMO.md`

## Blockers on this box

| Item | State | Impact |
|------|-------|--------|
| **Docker daemon** | Rootless: overlay invalid + iptables missing | Cannot `env:up` here — use Mac Docker Desktop |
| **Lace / 1AM** | Not in headless agent | UI Connect → local demo |
| Preview faucet | Captcha on `/api/drips` | Optional path only |

## Contract address (local)

_Pending `npm run env:up` on a Docker host, then `npm run deploy:local` → fill from `submission/artifacts/deploy-local.json`._

## How to run (offline demo always)

```bash
source "$HOME/.local/bin/env"
cd /workspace/midnight-carrot
npm install && npm run check && npm run dev
```

## Wave roadmap

| Wave | Status | Scope |
|------|--------|-------|
| **W0–W0.5** | Done | Compact 9 circuits, domain, UI, invites, submission pack |
| **W1-prep** | **This pass** | UI polish, **local deploy scripts**, docs |
| **W1** | Ready on Mac Docker | `env:up` → `deploy:local` smoke |
| **W2+** | Planned | Escrow, lobby index, on-ledger chat |
