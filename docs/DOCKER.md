# Local Midnight stack (Docker)

`compose.yml` starts proof-server (`:6300`), indexer (`:8088`), and node (`:9944`) for **Undeployed** — the WaveHack primary live path.

## Mac / Docker Desktop (preferred)

```bash
# Docker Desktop running
cd /path/to/carrot-midnight
npm run env:up
npm run deploy:local
npm run env:down
```

Or use the official tooling: https://github.com/midnightntwrk/midnight-local-dev (`npm start`).

## This build box (2026-09-16 WAT)

| Attempt | Result |
|---------|--------|
| `apt install docker.io` / `podman` | Needs root — denied |
| Docker **static** client 27.5.1 under `~/.local/docker/` | Client works |
| `newuidmap` / `newgidmap` | Present · `/etc/subuid` maps `box` |
| `dockerd-rootless.sh` | **Fails**: overlay mount invalid → then `iptables not found` |
| Docker Desktop GUI | Not available on this headless box |

**Conclusion:** document Mac-side `env:up` + `deploy:local`. Scripts succeed as soon as a real daemon is available. Offline UI demo + Compact compile do **not** need Docker.

Optional rootless retry on a capable Linux host (after `iptables` + working overlay):

```bash
# as root
apt-get install -y uidmap iptables
# as user
export PATH="$HOME/.local/docker:$PATH"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$HOME/.docker-run}"
mkdir -p "$XDG_RUNTIME_DIR" && chmod 700 "$XDG_RUNTIME_DIR"
dockerd-rootless.sh
DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock npm run env:up
```

The UI Connection panel probes these endpoints and lists deploy/call blockers when the stack is down.
