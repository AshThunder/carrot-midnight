import { useMemo, useState } from 'react'
import { Button } from '@/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import type { GameAccess } from '@/domain/game'
import { shortId } from '@/domain/game'
import type { LobbyListing } from '@/domain/lobbyStore'
import { FairnessPanel } from '@/components/FairnessPanel'

const WAGER_PRESETS = [10, 50, 100, 500] as const

interface LobbyProps {
  onCreate: (access: GameAccess, wager: bigint, challenged?: string) => void
  onJoinListing: (listing: LobbyListing) => void
  onJoinByCode: (code: string) => boolean
  openListings: LobbyListing[]
  onRefreshListings: () => void
  walletStubLabel: string
  localAddress: string
  onLocalAddressChange: (v: string) => void
  statusBanner?: { tone: 'info' | 'ok' | 'warn'; text: string }
}

export function Lobby({
  onCreate,
  onJoinListing,
  onJoinByCode,
  openListings,
  onRefreshListings,
  walletStubLabel,
  localAddress,
  onLocalAddressChange,
  statusBanner,
}: LobbyProps) {
  const [tab, setTab] = useState<GameAccess>('OPEN')
  const [wager, setWager] = useState('100')
  const [challenged, setChallenged] = useState('')
  const [joinCode, setJoinCode] = useState('')

  const wagerBig = useMemo(() => {
    const n = Number(wager)
    if (!Number.isFinite(n) || n < 1) return 1n
    return BigInt(Math.floor(n))
  }, [wager])

  const potPreview = useMemo(() => wagerBig * 2n, [wagerBig])

  const bannerClass =
    statusBanner?.tone === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
      : statusBanner?.tone === 'warn'
        ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
        : 'border-sky-500/40 bg-sky-500/10 text-sky-100'

  return (
    <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.15fr_0.85fr]">
      {statusBanner && (
        <div className={`lg:col-span-2 rounded-xl border px-4 py-3 text-sm ${bannerClass}`}>
          {statusBanner.text}
        </div>
      )}

      <div className="lg:col-span-2">
        <FairnessPanel />
      </div>

      <Card>
        <CardHeader>
          <Badge className="w-fit">Live floor · local store</Badge>
          <CardTitle className="text-3xl">
            Read the bluff.
            <br />
            <span className="text-carrot">Make the call.</span>
          </CardTitle>
          <CardDescription>
            One carrot. Two boxes. Public phases, private location — Midnight dual-ledger ZK.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant={tab === 'OPEN' ? 'default' : 'secondary'} onClick={() => setTab('OPEN')}>
              Open game
            </Button>
            <Button
              variant={tab === 'DIRECT' ? 'default' : 'secondary'}
              onClick={() => setTab('DIRECT')}
            >
              Direct challenge
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wager">Wager (carrots each)</Label>
            <div className="flex flex-wrap gap-2">
              {WAGER_PRESETS.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={wager === String(p) ? 'default' : 'outline'}
                  onClick={() => setWager(String(p))}
                >
                  {p}
                </Button>
              ))}
            </div>
            <Input
              id="wager"
              type="number"
              min={1}
              value={wager}
              onChange={(e) => setWager(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              You stake <span className="text-carrot font-semibold">{wagerBig.toString()}</span> · pot
              preview <span className="text-carrot font-semibold">{potPreview.toString()}</span> 🥕
            </p>
          </div>

          {tab === 'DIRECT' && (
            <div className="space-y-2">
              <Label htmlFor="challenged">Challenged pubkey / address</Label>
              <Input
                id="challenged"
                placeholder="mn_shield-addr_… or demo id"
                value={challenged}
                onChange={(e) => setChallenged(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Paste a Midnight address string. Local demo accepts any non-empty id.
              </p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={tab === 'DIRECT' && !challenged.trim()}
            onClick={() =>
              onCreate(tab, wagerBig, tab === 'DIRECT' ? challenged.trim() : undefined)
            }
          >
            Create {wagerBig.toString()}-carrot {tab === 'OPEN' ? 'open' : 'direct'} game
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Join with code</CardTitle>
            <CardDescription>
              Paste a 6-character code from another tab&apos;s invite bar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Input
              id="join-code"
              placeholder="e.g. 234567"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="max-w-[10rem] font-mono uppercase"
              aria-label="Join code"
            />
            <Button
              variant="secondary"
              disabled={!joinCode.trim()}
              onClick={() => {
                if (onJoinByCode(joinCode.trim())) setJoinCode('')
              }}
            >
              Join room
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Open games</CardTitle>
              <CardDescription>Local floor listing (persists in this browser).</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={onRefreshListings}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {openListings.length === 0 && (
              <p className="rounded-xl border border-dashed border-midnight-border p-4 text-sm text-slate-500">
                No open tables yet. Create one to list it here.
              </p>
            )}
            {openListings.map((g) => (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-midnight-border bg-midnight/40 px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-200">
                    {g.wager} 🥕 · {g.access}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    by {shortId(g.creatorId)} · {g.id}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onJoinListing(g)}>
                  Join
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity · wallet</CardTitle>
            <CardDescription>Demo address used as creator / opponent id.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="local-addr">Local pubkey / address</Label>
              <Input
                id="local-addr"
                value={localAddress}
                onChange={(e) => onLocalAddressChange(e.target.value)}
              />
            </div>
            <div className="rounded-xl border border-dashed border-midnight-border p-4 text-sm text-slate-400">
              {walletStubLabel}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-400">
              <li>Create commits location privately</li>
              <li>Share ?game= invite for multi-tab</li>
              <li>Accept → decision window</li>
              <li>Keep / Swap → revealing → settle</li>
              <li>Timeout forfeits to Player A</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
