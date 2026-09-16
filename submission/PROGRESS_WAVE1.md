# Progress description — Wave 1 (Akindo / Midnight)

**Project:** Carrot Midnight  
**Authors:** Chris Gold / AshThunder  
**Repo:** https://github.com/AshThunder/carrot-midnight (`midnightntwrk`)  
**License:** Apache-2.0  
**Date:** 2026-09-16 (WAT)

## What we built

A **private two-player bluffing game** (carrot-in-a-box) on Midnight: public phases/wager/commitment, private carrot location until selective `disclose()` at settle. Compact **9 circuits**, polished React UI (Welcome → Lobby → Room), encrypted bluff chat, multi-tab invites, and midnight-js 4.1.1 deploy/call gates.

## Wave 1 deliverables

| Requirement | Status |
|-------------|--------|
| Public GitHub + `midnightntwrk` | ✅ |
| Compiling Compact contract | ✅ 9 circuits (`compactc` 0.31.1 for Preprod ledger-v8) |
| Apache-2.0 | ✅ |
| README (project, setup, architecture, Midnight, how judges test) | ✅ |
| Slide deck / pitch | ✅ `docs/PITCH.md` + `submission/PITCH_DECK.md` |
| Demo / video pitch | ✅ Scripts ready; **video file recorded by submitter** |
| Progress description | ✅ this file |
| Preprod live deploy evidence | ✅ contract `0fb9c735…2c15` · tx `0098c5f5…ec2f0a` |

## Preprod evidence

- **Network:** `preprod`
- **Contract:** `0fb9c735e81dcc226d34c543d1cbeac27cd3ec0722e59bb2b31cb4badc2a2c15`
- **Deploy tx:** `0098c5f505555a4b99bb074c1806b6e7b9c240471a1327063e13f1bd722aec2f0a`
- **Artifact:** `submission/artifacts/deploy-preprod.json`
- **UI:** Settings → **PREPROD** shows the contract address; `VITE_MIDNIGHT_NETWORK=preprod` defaults live network

## How judges test

1. Open https://carrot-midnight.vercel.app (or `npm run dev`).
2. Offline product: Welcome → Lobby → Room (Local demo) — no wallet required.
3. Live: Settings → PREPROD → install Lace/1AM → proof server `:6300` → faucet https://faucet.preprod.midnight.network/
4. Confirm contract address matches artifact above.
5. `npm test && npm run lint && npm run build && npm run compile`

## What’s next (post Wave 1)

Escrow/token pot, on-ledger lobby index, chat ciphertext persistence, recorded pitch video polish.
