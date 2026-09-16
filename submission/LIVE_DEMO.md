# Live demo runbook — Carrot Midnight (judges / self)

**Repo:** https://github.com/AshThunder/carrot-midnight  
**Live UI:** https://carrot-midnight.vercel.app  
**Brand:** Carrot Midnight · topic: `midnightntwrk`  
**License:** Apache-2.0  
**Video:** Record from `docs/DEMO_SCRIPT.md` (file not in repo until submitter uploads)

## Wave 1 hard gate

1. Compact compiles: `npm run compile` → **9 circuits**
2. Public GitHub + Apache-2.0 + README
3. Topic `midnightntwrk`
4. Product demo: Welcome → Lobby → Room (local demo, no wallet)
5. Preprod evidence: see below

## Fast product demo (~3 min) — offline

1. Open live UI or `npm run dev`
2. Welcome → Enter → create open game → Room
3. Copy join code → second tab as B → peek / Keep-Swap / Settle
4. History + Settings drawers

## Primary live network — Preprod

| Field | Value |
|-------|--------|
| Contract | `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15` |
| Deploy tx | `0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a` |
| Artifact | `submission/artifacts/deploy-preprod.json` |
| Faucet | https://faucet.preprod.midnight.network/ |
| UI | Settings → **PREPROD** (address visible) |

```bash
docker compose up -d proof-server   # http://127.0.0.1:6300
# Lace/1AM → network Preprod → connect in Settings
# Optional redeploy: npm run preprod:deploy
```

## Secondary — local Undeployed

```bash
npm run env:up && npm run deploy:local && npm run test:local
```

See `docs/LIVE_STACK.md` · `docs/DOCKER.md`.
