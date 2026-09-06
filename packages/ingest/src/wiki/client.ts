/**
 * A small, polite MediaWiki API client for the Counter-Strike Online Wiki.
 *
 * - one request at a time, with a minimum delay between calls
 * - automatic `continue` pagination
 * - retries with exponential backoff on 429/5xx/network errors
 * - descriptive User-Agent (Fandom blocks anonymous scrapers; be identifiable)
 *
 * Note: cso.fandom.com may answer 402/403 to unfamiliar clients. If that
 * happens, run the same commands from a browser session (see docs/INGESTION.md)
 * or lower the rate. Never hammer the wiki — it is a volunteer project.
 */

export type WikiClientOptions = {
  baseUrl?: string
  userAgent?: string
  minDelayMs?: number
  maxRetries?: number
  fetch?: typeof fetch
  verbose?: boolean
}

export type PageRevision = {
  pageId: number
  title: string
  revisionId: number
  timestamp: string
  wikitext: string
  missing?: boolean
}

export type ImageInfo = {
  file: string
  url: string
  descriptionUrl?: string
  mime?: string
  width?: number
  height?: number
  size?: number
}

type QueryResponse = {
  batchcomplete?: string | boolean
  continue?: Record<string, string>
  query?: Record<string, unknown>
  error?: { code: string; info: string }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class WikiClient {
  private readonly baseUrl: string
  private readonly userAgent: string
  private readonly minDelayMs: number
  private readonly maxRetries: number
  private readonly fetchImpl: typeof fetch
  private readonly verbose: boolean
  private lastCall = 0
  private queue: Promise<unknown> = Promise.resolve()

  constructor(options: WikiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://cso.fandom.com').replace(/\/+$/, '')
    this.userAgent =
      options.userAgent ??
      'CSOW-ingest/0.1 (Counter-Strike Online World fan archive; https://github.com/csow; respects robots and rate limits)'
    this.minDelayMs = options.minDelayMs ?? 1100
    this.maxRetries = options.maxRetries ?? 4
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.verbose = options.verbose ?? false
  }

  /** Serialised, rate-limited, retried GET against api.php. */
  async api<T = QueryResponse>(params: Record<string, string | number | undefined>): Promise<T> {
    const run = async (): Promise<T> => {
      const wait = this.minDelayMs - (Date.now() - this.lastCall)
      if (wait > 0) await sleep(wait)
      const search = new URLSearchParams({ format: 'json', formatversion: '2' })
      for (const [k, v] of Object.entries(params)) if (v !== undefined) search.set(k, String(v))
      const url = `${this.baseUrl}/api.php?${search}`
      let attempt = 0
      while (true) {
        this.lastCall = Date.now()
        try {
          if (this.verbose) console.error(`[wiki] GET ${url}`)
          const res = await this.fetchImpl(url, {
            headers: { 'User-Agent': this.userAgent, Accept: 'application/json' },
          })
          if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
          if (!res.ok)
            throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true })
          const json = (await res.json()) as T & { error?: { code: string; info: string } }
          if (json.error)
            throw Object.assign(new Error(`${json.error.code}: ${json.error.info}`), {
              fatal: true,
            })
          return json
        } catch (err) {
          const fatal = (err as { fatal?: boolean }).fatal
          if (fatal || attempt >= this.maxRetries) throw err
          const backoff = 2 ** attempt * 1000 + Math.random() * 500
          if (this.verbose)
            console.error(
              `[wiki] retry ${attempt + 1} in ${Math.round(backoff)}ms: ${(err as Error).message}`,
            )
          await sleep(backoff)
          attempt += 1
        }
      }
    }
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next
  }

  /** Follows `continue` until exhausted, yielding each page's `query` object. */
  async *paginate(
    params: Record<string, string | number | undefined>,
  ): AsyncGenerator<Record<string, unknown>> {
    let cont: Record<string, string> = {}
    while (true) {
      const res = await this.api<QueryResponse>({ action: 'query', ...params, ...cont })
      if (res.query) yield res.query
      if (!res.continue) return
      cont = res.continue
    }
  }

  /** Titles (and optionally sub-categories) of a category. */
  async categoryMembers(
    category: string,
    options: { recursive?: boolean; namespace?: number } = {},
  ): Promise<string[]> {
    const title = category.startsWith('Category:') ? category : `Category:${category}`
    const titles = new Set<string>()
    const subcats: string[] = []
    for await (const q of this.paginate({
      list: 'categorymembers',
      cmtitle: title,
      cmlimit: 500,
      cmtype: options.recursive ? 'page|subcat' : 'page',
      cmnamespace: options.recursive ? undefined : (options.namespace ?? 0),
    })) {
      for (const m of (q.categorymembers as { ns: number; title: string }[]) ?? []) {
        if (m.ns === 14) subcats.push(m.title)
        else if (m.ns === (options.namespace ?? 0)) titles.add(m.title)
      }
    }
    if (options.recursive) {
      for (const sub of subcats)
        for (const t of await this.categoryMembers(sub, options)) titles.add(t)
    }
    return [...titles]
  }

  /** Latest revision wikitext for up to 50 titles per request. */
  async pages(titles: string[]): Promise<PageRevision[]> {
    const out: PageRevision[] = []
    for (let i = 0; i < titles.length; i += 50) {
      const batch = titles.slice(i, i + 50)
      for await (const q of this.paginate({
        prop: 'revisions',
        rvprop: 'ids|timestamp|content',
        rvslots: 'main',
        titles: batch.join('|'),
        redirects: 1,
      })) {
        for (const p of (q.pages as Record<string, unknown>[]) ?? []) {
          const rev = ((p.revisions as Record<string, unknown>[] | undefined) ?? [])[0]
          const slots = rev?.slots as { main?: { content?: string } } | undefined
          out.push({
            pageId: Number(p.pageid ?? 0),
            title: String(p.title),
            revisionId: Number(rev?.revid ?? 0),
            timestamp: String(rev?.timestamp ?? ''),
            wikitext: slots?.main?.content ?? '',
            missing: Boolean(p.missing),
          })
        }
      }
    }
    return out
  }

  /** Files used on a page (File: titles). */
  async pageImages(title: string): Promise<string[]> {
    const files: string[] = []
    for await (const q of this.paginate({ prop: 'images', imlimit: 500, titles: title })) {
      for (const p of (q.pages as { images?: { title: string }[] }[]) ?? [])
        for (const im of p.images ?? []) files.push(im.title)
    }
    return files
  }

  /** Direct URLs for File: titles. */
  async imageInfo(files: string[]): Promise<ImageInfo[]> {
    const out: ImageInfo[] = []
    for (let i = 0; i < files.length; i += 50) {
      const batch = files.slice(i, i + 50).map((f) => (f.startsWith('File:') ? f : `File:${f}`))
      for await (const q of this.paginate({
        prop: 'imageinfo',
        iiprop: 'url|size|mime',
        titles: batch.join('|'),
      })) {
        for (const p of (q.pages as Record<string, unknown>[]) ?? []) {
          const info = ((p.imageinfo as Record<string, unknown>[] | undefined) ?? [])[0]
          if (!info?.url) continue
          out.push({
            file: String(p.title).replace(/^File:/, ''),
            url: String(info.url),
            descriptionUrl: info.descriptionurl ? String(info.descriptionurl) : undefined,
            mime: info.mime ? String(info.mime) : undefined,
            width: info.width ? Number(info.width) : undefined,
            height: info.height ? Number(info.height) : undefined,
            size: info.size ? Number(info.size) : undefined,
          })
        }
      }
    }
    return out
  }

  /** Search titles (useful to check a page exists). */
  async search(term: string, limit = 10): Promise<string[]> {
    const res = await this.api<QueryResponse>({
      action: 'query',
      list: 'search',
      srsearch: term,
      srlimit: limit,
    })
    return ((res.query?.search as { title: string }[]) ?? []).map((s) => s.title)
  }

  pageUrl(title: string) {
    return `${this.baseUrl}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
  }
}
