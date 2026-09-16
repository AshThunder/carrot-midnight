/**
 * Headless Chrome check: Create Challenge + How to Play stay above blurred backdrop.
 * Usage: node scripts/verify-modal-layer.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'logs', 'modal-verify')
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'

await mkdir(outDir, { recursive: true })

async function withPreview(run) {
  if (process.argv[2]) return run(process.argv[2])
  const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  })
  let ready = false
  const waitReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview startup timeout')), 60000)
    const onData = (buf) => {
      const s = buf.toString()
      if (/Local:|4173/.test(s)) {
        ready = true
        clearTimeout(timer)
        resolve()
      }
    }
    preview.stdout.on('data', onData)
    preview.stderr.on('data', onData)
    preview.on('exit', (code) => {
      if (!ready) {
        clearTimeout(timer)
        reject(new Error(`preview exited early: ${code}`))
      }
    })
  })
  try {
    await waitReady
    await new Promise((r) => setTimeout(r, 800))
    return await run('http://127.0.0.1:4173')
  } finally {
    preview.kill('SIGTERM')
  }
}

function clickButtonByText(page, re) {
  return page.evaluate((pattern) => {
    const rx = new RegExp(pattern, 'i')
    const buttons = [...document.querySelectorAll('button')]
    const btn = buttons.find((b) => rx.test(b.textContent || ''))
    if (!btn) throw new Error(`button not found: ${pattern}`)
    btn.click()
    return (btn.textContent || '').trim().slice(0, 80)
  }, re)
}

const report = await withPreview(async (url) => {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,900'],
  })
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 })

    await clickButtonByText(page, 'enter|play|floor|continue')
    await new Promise((r) => setTimeout(r, 700))

    // Preprod disables Create until wallet connect — switch to local demo so create opens.
    await clickButtonByText(page, 'settings')
    await new Promise((r) => setTimeout(r, 400))
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      const localNet = buttons.find((b) => /^\s*LOCAL\s*$/i.test(b.textContent || ''))
      localNet?.click()
      const demo = buttons.find((b) => /local demo/i.test(b.textContent || ''))
      demo?.click()
    })
    await new Promise((r) => setTimeout(r, 500))
    await page.evaluate(() => {
      document.querySelector('.drawer-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      document.querySelectorAll('.modal-backdrop.show').forEach((b) =>
        b.dispatchEvent(new MouseEvent('click', { bubbles: true })),
      )
    })
    await new Promise((r) => setTimeout(r, 400))

    async function checkModal(openPattern, modalSelector, shotName) {
      await clickButtonByText(page, openPattern)
      await new Promise((r) => setTimeout(r, 500))

      const info = await page.evaluate((sel) => {
        const modal = document.querySelector(`${sel}.show`) || document.querySelector(sel)
        const backdrops = [...document.querySelectorAll('.modal-backdrop.show')]
        if (!modal) return { ok: false, reason: `modal missing: ${sel}` }
        const ms = getComputedStyle(modal)
        const modalZ = Number.parseInt(ms.zIndex, 10) || 0
        const backdropZs = backdrops.map((b) => Number.parseInt(getComputedStyle(b).zIndex, 10) || 0)
        const maxBackdrop = backdropZs.length ? Math.max(...backdropZs) : -1
        const filter = ms.filter
        const backdropFilter = ms.backdropFilter || ms.webkitBackdropFilter || 'none'
        const rect = modal.getBoundingClientRect()
        const center = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + Math.min(48, Math.max(12, rect.height / 4)),
        )
        const clickable = !!center && (modal === center || modal.contains(center))
        return {
          ok:
            modal.classList.contains('show') &&
            modalZ > maxBackdrop &&
            clickable &&
            (filter === 'none' || filter === '') &&
            (backdropFilter === 'none' || backdropFilter === ''),
          modalZ,
          maxBackdrop,
          filter,
          backdropFilter,
          clickable,
          ariaHidden: modal.getAttribute('aria-hidden'),
          centerTag: center?.tagName,
          centerClass: typeof center?.className === 'string' ? center.className : '',
          show: modal.classList.contains('show'),
        }
      }, modalSelector)

      await page.screenshot({ path: path.join(outDir, shotName), fullPage: false })

      await page.evaluate(() => {
        const close = document.querySelector(
          '.modal.show .close-modal, .modal.show .close-rules, [data-modal].show .close-modal',
        )
        close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.querySelectorAll('.modal-backdrop.show').forEach((b) => {
          b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
      })
      await new Promise((r) => setTimeout(r, 300))
      return info
    }

    const create = await checkModal('create a challenge', '[data-modal="create-challenge"]', 'create-challenge.png')
    const rules = await checkModal('how to play', '[data-modal="rules"]', 'how-to-play.png')

    return { create, rules, outDir }
  } finally {
    await browser.close()
  }
})

await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (!report.create.ok || !report.rules.ok) {
  console.error('Modal layer verification FAILED')
  process.exit(1)
}
console.log('Modal layer verification OK')
