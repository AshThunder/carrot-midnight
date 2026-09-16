# Contributing to Carrot Midnight

Thanks for interest in **Carrot Midnight** — a private two-player bluffing game on Midnight Network.

## Quick start

```bash
source "$HOME/.local/bin/env"   # Node ≥ 22
npm install
npm run compile                # Compact 9 circuits
npm test
npm run lint
npm run build
npm run dev
```

Local demo play does **not** require Docker or a wallet extension. Use **Demo wallet** in the UI.

## Guidelines

- Keep domain logic pure (`src/domain/*`) and covered by Vitest.
- Never put carrot location in public circuit arguments — witnesses + commit–reveal only.
- Prefer small, focused PRs: contract / domain / UI / midnight wiring.
- Do not commit secrets, `.env` with keys, or generated noise outside `contracts/managed/`.
- Match existing tone: carrots, boxes, privacy — no unrelated chain branding.

## Checks before PR

- [ ] `npm test` green
- [ ] `npm run lint` green
- [ ] `npm run build` green
- [ ] If Compact changed: `npm run compile` succeeds
- [ ] Update `STATUS.md` when blockers or wave scope change

## Publishing note

When the repo is public on GitHub, add the topic **`midnightntwrk`** (Midnight Network ecosystem discovery). License is **Apache-2.0** (`LICENSE`).

## Live stack (optional)

Docker + Lace/1AM are required only for on-chain deploy/call. See `docs/DOCKER.md` and `STATUS.md`.
