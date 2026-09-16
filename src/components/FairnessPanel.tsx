import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'

/**
 * Midnight-native fairness explainer — commitment, private peek, selective disclose at settle.
 * No forbidden legacy chain / crypto jargon.
 */
export function FairnessPanel() {
  const [open, setOpen] = useState(true)

  return (
    <Card className="border-violet-500/25 bg-midnight-card/90">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div>
          <Badge className="mb-2 w-fit border-violet-400/40 bg-violet-500/15 text-violet-100">
            Fairness · Midnight dual ledger
          </Badge>
          <CardTitle className="text-xl">How the carrot stays honest</CardTitle>
          <CardDescription>
            Public phases you can audit. Private witnesses until you choose to open them.
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4 text-sm text-slate-300">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <strong className="text-slate-100">Commitment at create</strong>
              <p className="mt-1 text-slate-400">
                Player A samples the carrot location and a salt as <em>private state</em>. Compact
                writes only a <strong className="text-violet-200">persistentHash</strong> commitment
                to the public ledger. The location cannot change later without failing settle.
              </p>
            </li>
            <li>
              <strong className="text-slate-100">Private peek</strong>
              <p className="mt-1 text-slate-400">
                Peek reads local private state only — no public ledger write, nothing for Player B to
                observe. Bluffing chat can still run encrypted beside the sealed commitment.
              </p>
            </li>
            <li>
              <strong className="text-slate-100">Selective disclosure at settle</strong>
              <p className="mt-1 text-slate-400">
                After Keep/Swap, settle re-supplies location + salt as witnesses, verifies the
                commitment in-circuit, then <strong className="text-violet-200">disclose()</strong>{' '}
                publishes the location and winner. Timeout/cancel never require opening the
                commitment.
              </p>
            </li>
          </ol>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-midnight-border bg-midnight/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Public</p>
              <p className="text-xs text-slate-200">phase · wager · commitment · decision</p>
            </div>
            <div className="rounded-xl border border-midnight-border bg-midnight/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Private</p>
              <p className="text-xs text-slate-200">location · salt · peek · chat plaintext</p>
            </div>
            <div className="rounded-xl border border-carrot/30 bg-carrot/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-carrot/80">At settle</p>
              <p className="text-xs text-carrot">verify · disclose · award pot</p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
