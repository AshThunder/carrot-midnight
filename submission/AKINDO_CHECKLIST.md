# Akindo / Midnight buildathon checklist

## Repo hygiene

- [x] Public GitHub — https://github.com/AshThunder/carrot-midnight
- [x] Topic **`midnightntwrk`**
- [x] License **Apache-2.0**
- [x] README + `STATUS.md` current (Preprod primary)
- [x] Live UI — https://carrot-midnight.vercel.app
- [x] No forbidden legacy-chain branding

## Compact / Midnight

- [x] Compiling Compact (`npm run compile` → 9 circuits)
- [x] `pragma language_version` ≥ 0.23
- [x] Dual-ledger commit–reveal in README + Rules modal
- [x] midnight-js 4.1.1 wiring; deploy gated until Ready
- [x] **Preprod** in UI (`LOCAL | PREVIEW | PREPROD`) + known contract address
- [x] **Preprod** live deploy: `submission/artifacts/deploy-preprod.json`
- [x] Contract `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15`
- [x] Deploy tx `0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a`
- [x] Local Undeployed secondary: `npm run env:up` → `deploy:local` (optional)

## Product demo

- [x] Local demo without wallet/Docker (Welcome → Lobby → Room)
- [x] `docs/PITCH.md` · `submission/PITCH_DECK.md` · `submission/pitch-deck.html`
- [x] `docs/DEMO_SCRIPT.md` · `submission/LIVE_DEMO.md`
- [x] `docs/LIVE_STACK.md` — **Preprod primary**
- [x] `submission/PROGRESS_WAVE1.md` progress description
- [ ] **Demo video file** (record from script — not committed yet)

## Quality gate

```bash
npm test && npm run lint && npm run build
# optional: npm run compile
```

## Narrative

1. **What:** Private carrot-in-a-box bluffing on Midnight.  
2. **Why Midnight:** Public fairness + private location until disclose.  
3. **Proof:** Compiling Compact + polished offline demo + **Preprod live contract**.  
4. **Live txs:** Preprod faucet → DUST → deploy (artifact above).
