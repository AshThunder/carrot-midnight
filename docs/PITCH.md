# Pitch — Carrot Midnight

## One-liner

**Carrot Midnight** is a two-player private bluffing game on Midnight: public stakes and phases, private carrot location, ZK-settled Keep/Swap.

## Why Midnight

Bluffing dies when the carrot is public. Transparent chains force awkward encrypt-and-hope schemes. Midnight’s **dual ledger** lets us:

- Publish **phase, wager, commitment, decision** for fairness and spectating
- Keep **location + salt** in **witnesses** until intentional `disclose()` at settle
- Prove settle math in-circuit so neither player can cheat the pot

## Player fantasy

You create a table. You peek. You chat. They sweat. They Keep or Swap. The boxes open. Privacy was the point — and the punchline.

## What’s shipping now (offline-first)

- **9 Compact circuits** compiled (`create` / accept / cancel / decide / chat hash / settle / forfeit)
- **Premium UI flow:** Welcome → Lobby → Room (Carrot Midnight game.css skin)
- **Local demo** fully playable: lobby floor, shareable multi-tab invites + join codes in Room HUD, role seats (A/B), pot + deadline, forfeit, result modal
- **Encrypted bluffing chat** (AES-GCM) with ciphertext hashes ready for `postChatCiphertext`
- **Match history + local leaderboard** in the History drawer
- **Settings drawer:** sound mute (background audio + UI beeps), network toggle, Midnight connection / Deploy / Smoke gates
- **midnight-js 4.1.1** providers + deploy/call service **gated** until Docker stack + Lace/1AM (or Preview scripts) are ready
- **Local Undeployed deploy** (`npm run env:up` → `deploy:local`) with genesis wallet — WaveHack primary; see `docs/LIVE_STACK.md`
- Preview scripts kept as **secondary** optional path

## Links

- GitHub: https://github.com/AshThunder/carrot-midnight
- Live: https://carrot-midnight.vercel.app
- Topic: `midnightntwrk`

## Buildathon fit

- Compiling Compact contract (`pragma >= 0.23`)
- Dual-ledger architecture documented and implemented
- Polished React UX with box theatre + result modal
- Clear Wave roadmap: local product depth now → live proofs when faucet + proving are available

## Ask

Ship the local product demo today; W1 live txs finish on **Undeployed** with Docker Desktop (`env:up` + `deploy:local`).
