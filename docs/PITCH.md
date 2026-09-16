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

## What’s shipping (Wave 1)

- **9 Compact circuits** compiled (`create` / accept / cancel / decide / chat hash / settle / forfeit)
- **Premium UI:** Welcome → Lobby → Room (hinged boxes, drawers)
- **Local demo** fully playable without wallet/Docker
- **Encrypted bluffing chat** (AES-GCM) with ciphertext hashes ready for `postChatCiphertext`
- **Match history** + Settings connection panel
- **midnight-js 4.1.1** providers + deploy/call gated until Ready
- **Preprod live deploy** — contract `0fb9c735…2c15` (tx `0098c5f5…ec2f0a`); UI toggle **PREPROD** shows the address
- Local Undeployed + Preview kept as secondary paths

## Links

- GitHub: https://github.com/AshThunder/carrot-midnight
- Live: https://carrot-midnight.vercel.app
- Topic: `midnightntwrk`
- Deck export: `submission/PITCH_DECK.md` · `submission/pitch-deck.html`

## Buildathon fit

- Compiling Compact contract (`pragma >= 0.23`)
- Dual-ledger architecture documented and implemented
- Polished React UX with box theatre + result modal
- Live Preprod evidence for Wave 1 judges

## Ask

Judge the offline product demo today; verify Preprod contract address in Settings → PREPROD. Remaining human step: record the demo video from `docs/DEMO_SCRIPT.md`.
