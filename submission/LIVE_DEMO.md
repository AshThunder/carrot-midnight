# Live demo runbook — Carrot Midnight (judges / self)

**Repo:** https://github.com/AshThunder/carrot-midnight  
**Live UI:** https://carrot-midnight.vercel.app  
**Brand:** Carrot Midnight · topic: `midnightntwrk`  
**License:** Apache-2.0

## Wave 1 hard gate (no Docker required)

1. Compact compiles: `npm run compile` → **9 circuits**
2. Public GitHub + Apache-2.0 + README
3. Topic `midnightntwrk`
4. Product demo: Welcome → Lobby → Room (local demo, no wallet)

## Fast product demo (~3 min) — offline

1. Open live UI or `npm run dev`
2. Welcome → Enter Floor → create open game → Room
3. Copy join code → second tab as B → peek / Keep-Swap / Settle
4. History + Settings drawers

## Primary live deploy (local Undeployed)

```bash
# Mac: Docker Desktop running
npm run env:up
npm run deploy:local     # genesis …0001, no faucet
npm run test:local
```

Or [midnight-local-dev](https://github.com/midnightntwrk/midnight-local-dev) `npm start`, then `deploy:local`.

See `docs/LIVE_STACK.md` · `docs/DOCKER.md`.

## Secondary (optional): Preview

Only if exploring public testnet — faucet captcha often required. Not the WaveHack primary ask.
