# Live stack — Carrot Midnight

## Primary path (WaveHack): Local Undeployed

Akindo Wave 1 emphasizes **local Undeployed/devnet** via Docker compose or [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev): node + indexer + proof server. The **genesis wallet is pre-funded** — **no faucet**.

Hard gate for the wave: compiling Compact + public GitHub + `midnightntwrk` topic + Apache-2.0 + README/demo. Live Preview deploy is **optional**, not required.

### Mac / Docker Desktop (exact commands)

```bash
# 1. Start Docker Desktop and wait until the engine is running
docker version

# 2. From this repo
cd /path/to/carrot-midnight
source "$HOME/.local/bin/env"   # if using the box Node 22 helper; else ensure Node ≥ 22
npm install
npm run env:up                 # proof-server :6300, indexer :8088, node :9944

# 3. Health
curl -s http://127.0.0.1:6300/health
curl -s http://127.0.0.1:9944/health
curl -s -X POST http://127.0.0.1:8088/api/v4/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ block { height } }"}'

# 4. Deploy + smoke (genesis seed …0001)
npm run deploy:local
# → submission/artifacts/deploy-local.json

# 5. Combined gate
npm run test:local             # vitest + deploy:local when stack is up

npm run env:down
```

### midnight-local-dev alternative

```bash
git clone https://github.com/midnightntwrk/midnight-local-dev.git
cd midnight-local-dev && npm install && npm start
# funding menu available; genesis already holds NIGHT
# then from carrot-midnight: npm run deploy:local
```

### UI against local stack

1. `npm run dev` (or https://carrot-midnight.vercel.app for offline demo only)
2. Settings → Network **Local** → Connect Lace on **Undeployed** (or Local demo for product play)
3. When stack dots green + wallet Ready → Deploy / Smoke call

| Service | URL |
|---------|-----|
| Network ID | `undeployed` |
| Node | `http://127.0.0.1:9944` |
| Indexer | `http://127.0.0.1:8088/api/v4/graphql` |
| Proof server | `http://127.0.0.1:6300` |
| Funding | Genesis seed `…0001` (hello-world Alice) — no faucet |

## This agent box (2026-09-16 WAT)

Docker rootless fails here (`overlay` + missing `iptables`) — see `docs/DOCKER.md`. Scripts are ready for the moment a daemon is up: `npm run env:up` → `npm run deploy:local`.

## Secondary path: Preview / Preprod

Public node/indexer when you want a shared testnet. Requires faucet (often captcha) + proving (local `:6300` or ProofStation). Keep for later; not the WaveHack primary story.

```bash
npm run preview:wallet
# browser faucet if API captcha-blocks
PROOF_SERVER=station npm run preview:deploy
```

Endpoints: `docs.midnight.network` environment reference · `src/midnight/config.ts`.
