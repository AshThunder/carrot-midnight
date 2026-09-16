# Live Midnight stack

## Primary path: Preprod (public testnet)

Carrot Midnight targets **Preprod** for live deploy and demo evidence.

| Service | Value |
|---------|--------|
| Network ID | `preprod` |
| Node | `https://rpc.preprod.midnight.network` |
| Indexer | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| Proof server | Local Docker `:6300` (private proving; always local) |
| Faucet | https://faucet.preprod.midnight.network/ |

Akindo Wave 1 hard gate remains: compiling Compact + public GitHub with `midnightntwrk` + Apache-2.0 + README + slides + demo. Live Preprod deploy is our chosen evidence path (not a Wave 1 mandate).

### Exact commands

```bash
# Proof server only (or full compose — only :6300 is required for Preprod proving)
docker compose up -d proof-server
curl -s http://127.0.0.1:6300/health

npm run preprod:wallet    # mn_addr_preprod… under .preview-wallet/ (gitignored seed)
# Fund via browser faucet (captcha): paste unshielded address
npm run preprod:faucet -- --wait=600
npm run preprod:deploy    # writes submission/artifacts/deploy-preprod.json
```

Deploy script (`scripts/preview-deploy.mjs`, run via `tsx`):
- hello-world providers: `levelPrivateStateProvider` + password, `httpClientProofProvider(url, zkConfigProvider)`, `NodeZkConfigProvider` on `contracts/managed/carrot-game`
- wraps `getCoinPublicKey` / `getEncryptionPublicKey` to primitive hex (String / `{tag:schnorr,value}` safe)
- wallet sync timeout default **45 min** (`WALLET_SYNC_TIMEOUT_MS`)
- after tNIGHT, registers NIGHT UTXOs for **tDUST** fee generation

After faucet: wait for tNIGHT, then DUST registration runs automatically in `preprod:deploy` (or Lace “Generate tDUST”) before fees work.

### Lace (browser demo)

1. Lace → Network **Preprod**
2. Proof server → Local `http://localhost:6300`
3. Open https://carrot-midnight.vercel.app → connect

## Secondary: local Undeployed

Docker node+indexer+proof for offline genesis testing (`npm run env:up` → `deploy:local`). Useful for fast iteration; not our submission live network.

## Optional: Preview

Same script family with `--network=preview`. Prefer Preprod for Wave evidence.

## Toolchain note (preprod protocol 1_000_000)

Preprod/preview currently report `protocolVersion: 1000000` (ledger-v8 era; v9 fork at `2000000`).
Compile with **compactc 0.31.1** → `compact-runtime@0.16.0` → `contract-state[v6]` (ledger-v8).
Do **not** use compactc 0.34 / runtime 0.19 (`contract-state[v8]`) until the network crosses the v9 fork.

Dust sync on preprod replays ~1.5M ledger events (~30–40 min with `scripts/patch-dust-sync-speed.mjs`).
