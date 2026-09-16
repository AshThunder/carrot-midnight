# Akindo / Midnight buildathon checklist

## Repo hygiene

- [x] Public GitHub — https://github.com/AshThunder/carrot-midnight
- [ ] Topic **`midnightntwrk`** (confirm in GitHub settings)
- [x] License **Apache-2.0**
- [x] README + `STATUS.md` current
- [x] Live UI — https://carrot-midnight.vercel.app
- [x] No forbidden legacy-chain branding

## Compact / Midnight

- [x] Compiling Compact (`npm run compile` → 9 circuits)
- [x] `pragma language_version` ≥ 0.23
- [x] Dual-ledger commit–reveal in README + Rules modal
- [x] midnight-js 4.1.1 wiring; deploy gated until Ready
- [x] **Local Undeployed** scripts: `npm run env:up` → `deploy:local` / `test:local` (genesis, no faucet)
- [ ] `submission/artifacts/deploy-local.json` with `contractAddress` (run on Mac Docker)

## Product demo

- [x] Local demo without wallet/Docker (Welcome → Lobby → Room)
- [x] `docs/PITCH.md` · `docs/DEMO_SCRIPT.md` · `submission/LIVE_DEMO.md`
- [x] `docs/LIVE_STACK.md` — **local first**, Preview secondary

## Quality gate

```bash
npm run check          # always
npm run test:local     # vitest; + deploy when Docker up
```

## Narrative

1. **What:** Private carrot-in-a-box bluffing on Midnight.  
2. **Why Midnight:** Public fairness + private location until disclose.  
3. **Proof:** Compiling Compact + polished offline demo + local deploy scripts.  
4. **Live txs:** Undeployed via Docker genesis wallet when daemon available.
