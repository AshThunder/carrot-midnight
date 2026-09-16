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
- **Local demo** fully playable: lobby floor, shareable multi-tab invites, fairness panel, role seats (A/B), pot + deadline, forfeit, result modal with hinged-box reveal
- **Encrypted bluffing chat** (AES-GCM) with ciphertext hashes ready for `postChatCiphertext`
- **Match history + local leaderboard** persisted in the browser
- **midnight-js 4.1.1** providers + deploy/call service **gated** until Docker stack + Lace/1AM are ready
- Connection panel: network toggle, stack probes, Deploy / Smoke call (disabled with reasons when not live)

## Buildathon fit

- Compiling Compact contract (`pragma >= 0.23`)
- Dual-ledger architecture documented and implemented
- Polished React UX with GSAP box theatre + result modal
- Clear Wave roadmap: local product depth now → live proofs when stack is up

## Ask

Ship the local product demo today; W1 finishes live deploy once Docker + Lace are available on the host.
