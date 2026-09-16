import { useState } from 'react'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Badge } from '@/ui/badge'
import { flashUi } from '@/lib/uiFeedback'

type InviteBarProps = {
  gameId: string
  joinCode: string
  inviteUrl: string
}

/**
 * Copyable room invite link + join code for same-browser multi-tab local demo.
 */
export function InviteBar({ gameId, joinCode, inviteUrl }: InviteBarProps) {
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)

  const copy = async (kind: 'link' | 'code', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      flashUi('ok')
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      flashUi('warn')
    }
  }

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300/80">Share room</p>
          <p className="text-sm text-slate-200">
            Multi-tab local demo via <code className="text-sky-200">?game=</code> + BroadcastChannel
          </p>
        </div>
        <Badge className="font-mono text-sky-100">code {joinCode}</Badge>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input readOnly value={inviteUrl} className="font-mono text-xs" aria-label="Invite URL" />
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => void copy('link', inviteUrl)}>
            {copied === 'link' ? 'Copied link' : 'Copy link'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void copy('code', joinCode)}>
            {copied === 'code' ? 'Copied code' : 'Copy code'}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Room <span className="font-mono text-slate-400">{gameId}</span> — open the link in another tab
        to sit as Player B. Same browser origin required.
      </p>
    </div>
  )
}
