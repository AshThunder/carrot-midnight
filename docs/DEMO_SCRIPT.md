# Demo script — Carrot Midnight (≈ 3–4 minutes)

## Setup

1. Open https://carrot-midnight.vercel.app **or** `source "$HOME/.local/bin/env" && npm run dev`.
2. Mention: Compact compiles (**9 circuits**); **local demo is first-class** — wallet/Docker optional. Settings drawer shows deploy gates.

## Beat-by-beat

1. **Welcome (15s)** — Brand splash, network pill, sound toggle. Click **Enter Floor** (or How to Play → Rules).

2. **Lobby (25s)** — Game floor + wager presets. “Open game, 100 carrots.” Create.  
   Say: “Location committed publicly as a hash; value stays private.” Optional: **direct challenge** or paste **join code**.

3. **Invite multi-tab (20s)** — In Room, left rail shows **JOIN CODE** + Copy invite / Copy code. Open second tab → Player B. “BroadcastChannel sync — same browser, no network.”

4. **Roles + peek (25s)** — Seat toggles A/B. Act as A → tap **your box** for private peek.  
   Lid opens; carrot pops. “No public ledger write.”

5. **Accept + deadline (25s)** — Accept as B. Show decision countdown. Chat unlocks.

6. **Chat (20s)** — Send a bluff: AES-GCM; ciphertext hash mirrors Compact `postChatCiphertext`.

7. **Decision → settle (40s)** — Act as B → **Keep** or **Swap**. Click **Settle · open boxes** — result modal + pot.

8. **History (15s)** — Dock **HISTORY** → settled row + local leaderboard.

9. **Timeout path (15s)** — New game → accept → **Simulate timeout forfeit** → pot to A, sealed commitment.

10. **Connection / Compact (25s)** — Dock **SETTINGS**: stack dots, Local vs Preview. Flash Compact + `STATUS.md`. Say live path is **Undeployed** via `npm run env:up` + `deploy:local` (genesis, no faucet).

11. **Close (10s)** — Wave hard gate is Compact + demo offline; live smoke on Mac Docker Undeployed when ready.

## Backup lines

- “Cancel works only while waiting indefinitely.”
- “Sound toggle mutes background music and UI beeps.”
- “Reduced-motion users get instant lid state.”
- “Share `?game=` invite for two-tab local play.”
- “GitHub topic when published: `midnightntwrk`.”
