# Local Midnight stack (Docker)

`compose.yml` starts proof-server (`:6300`), indexer (`:8088`), and node (`:9944`).

## This build box (2026-09-16 WAT)

| Attempt | Result |
|---------|--------|
| `apt install docker.io` / `podman` | Needs root — denied |
| Docker **static** client 27.5.1 under `~/.local/docker/` | Client works |
| `dockerd-rootless.sh` | **Fails**: `newuidmap` not on PATH (uidmap package). `/etc/subuid`/`subgid` already map `box`. Without `newuidmap`/`newgidmap`, RootlessKit cannot set UID/GID maps. |
| Interactive Docker Desktop GUI | Not available / not usable here |

**Conclusion:** leave stack documented. When a host has Docker Engine (or rootless with `uidmap` + `slirp4netns`/`vpnkit`), run:

```bash
source "$HOME/.local/bin/env"
export PATH="$HOME/.local/docker:$PATH"   # if using static client
cd /workspace/midnight-carrot
npm run env:up
npm run env:down
```

Optional: install `uidmap` (provides `newuidmap`/`newgidmap`) as root, then retry rootless:

```bash
# as root on a capable host
apt-get install -y uidmap
# as box
export PATH="$HOME/.local/docker:$PATH"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-$HOME/.docker-run}"
mkdir -p "$XDG_RUNTIME_DIR" && chmod 700 "$XDG_RUNTIME_DIR"
dockerd-rootless.sh
```

The UI Connection panel probes these endpoints and lists deploy/call blockers when the stack is down.
