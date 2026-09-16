# Demo script — Carrot Midnight (≈ 3–4 minutes)

## Setup

1. `source "$HOME/.local/bin/env" && npm run dev` → open the lobby.
2. Mention: Compact compiles (**9 circuits**); **local demo is first-class** — wallet/Docker optional. Connection panel shows deploy gates.

## Beat-by-beat

1. **Lobby (25s)** — Fairness panel (commit / peek / disclose). Open-games + wager presets + pot preview. “Open game, 100 carrots.” Create.  
   Say: “Location committed publicly as a hash; value stays private.” Optional: **direct challenge**.

2. **Invite multi-tab (20s)** — Copy **invite link** / join code from InviteBar. Open second tab → Player B. “BroadcastChannel sync — same browser, no network.”

3. **Roles + peek (25s)** — Point at **Player A / Player B** seat toggles and pot strip. Act as A → **Private peek (A only)**.  
   GSAP lid hinges; carrot pops. “No public ledger write.”

4. **Accept + deadline (25s)** — Accept as B. Show **decision deadline** countdown (≥ 1h). Chat unlocks.

5. **Chat (20s)** — Send a bluff: AES-GCM; toggle **Show CT**. Ciphertext hash mirrors Compact `postChatCiphertext`.

6. **Decision → reveal modal (40s)** — Act as B → **Keep** or **Swap**. Phase → **Revealing**.  
   Click **Settle · open boxes** — **result modal** opens with hinged boxes + carrot + winner/pot.

7. **History (15s)** — New lobby → show **Match history** + **Local leaderboard** populated from the settle.

8. **Timeout path (15s)** — New game → accept → **Simulate timeout forfeit** (or Claim forfeit as A) → pot to A, sealed commitment, history row `FORFEITED`.

9. **Connection / Compact (25s)** — Connection panel: stack dots, Deploy disabled reasons. Flash `contracts/carrot-game.compact` + `STATUS.md`.

10. **Close (10s)** — Live txs need Docker `env:up` + Lace/1AM; product depth works offline today.

## Backup lines

- “Cancel works only while waiting indefinitely.”
- “Sound is optional (header toggle) — CSS flashes work either way.”
- “Reduced-motion users get instant lid state.”
- “Share `?game=` invite for two-tab local play.”
- “GitHub topic when published: `midnightntwrk`.”
