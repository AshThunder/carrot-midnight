# Carrot Midnight — Pitch deck (markdown export)

*Export to PDF/HTML slides as needed for Akindo. Source narrative: `docs/PITCH.md`.*

---

## Slide 1 — Title
**Carrot Midnight**  
Private two-player bluffing on Midnight Network  
Chris Gold / AshThunder · Apache-2.0 · `midnightntwrk`

---

## Slide 2 — Problem
Bluffing dies when the secret is public.  
Transparent chains force awkward encrypt-and-hope schemes.

---

## Slide 3 — Insight
Midnight **dual ledger**: public fairness + private witnesses until selective disclose.

---

## Slide 4 — Product
Create table → optional peek → encrypted chat bluff → Keep/Swap → settle / open boxes → pot.

---

## Slide 5 — Architecture
- Compact **9 circuits** (create / accept / cancel / decide / chat hash / settle / forfeit)
- Commit–reveal: `persistentHash(salt, location)` public; location private until settle
- React + GSAP UI · midnight-js 4.1.1 gated deploy/call

---

## Slide 6 — Wave 1 proof
- Compiling Compact + public GitHub + Apache-2.0
- **Preprod live deploy:** `0fb9c735…2c15` (tx `0098c5f5…ec2f0a`)
- UI network toggle: Local / Preview / **Preprod**

---

## Slide 7 — Demo path
1. Offline: Welcome → Lobby → Room (judges, no wallet)
2. Live: Lace/1AM + proof server `:6300` + Preprod faucet
3. Settings shows Preprod contract address

---

## Slide 8 — Ask / next
Ship Wave 1 evidence today. Next: escrow pot, lobby index, on-ledger chat.

**Links:** https://github.com/AshThunder/carrot-midnight · https://carrot-midnight.vercel.app
