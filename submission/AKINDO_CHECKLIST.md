# Akindo / Midnight buildathon checklist

Use this before publishing the GitHub repo and submission form.

## Repo hygiene

- [ ] Public GitHub repository
- [ ] Topic / tag: **`midnightntwrk`**
- [ ] License file: **Apache-2.0** (see `/LICENSE`)
- [ ] Clear README with gameflow, privacy model, setup, Wave status
- [ ] `STATUS.md` current (W0.5+)
- [ ] No forbidden legacy-chain branding in copy or commits intended for review

## Compact / Midnight

- [ ] Compiling Compact contract (`npm run compile` → 9 circuits)
- [ ] `pragma language_version` ≥ 0.23
- [ ] Dual-ledger commit–reveal described (README + Fairness panel + this pack)
- [ ] midnight-js wiring present (4.1.1); live deploy gated honestly when Docker/Lace absent

## Product demo

- [ ] Local demo playable without wallet/Docker
- [ ] Pitch one-pager: `docs/PITCH.md`
- [ ] Demo script (~3–4 min): `docs/DEMO_SCRIPT.md` — include invite multi-tab + fairness panel beats
- [ ] Screenshot / shot list noted in README (or `docs/screenshots/`)
- [ ] Optional: short screen recording of settle modal + invite link

## Quality gate

```bash
source "$HOME/.local/bin/env"   # Node 22 PATH
cd /workspace/midnight-carrot
npm run check   # test + lint + build + compile
```

- [ ] `npm run check` green on clean machine
- [ ] Document Docker blocker honestly if live stack not demonstrated

## Submission narrative (suggested)

1. **What:** Private carrot-in-a-box bluffing on Midnight.
2. **Why Midnight:** Public fairness + private location until intentional disclose.
3. **Proof:** Compiling Compact + offline product depth + roadmap to live proofs.
4. **Ask:** Review local demo + Compact; W1 live txs when host has Docker + Lace.
