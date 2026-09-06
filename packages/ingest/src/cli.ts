#!/usr/bin/env node
/**
 * @csow/ingest — pull the Counter-Strike Online Wiki into normalized seed data.
 *
 *   pnpm ingest -- categories                          # list top-level categories with counts
 *   pnpm ingest -- page --title Anemone --type character --dry-run
 *   pnpm ingest -- pages --type character [--category Characters] [--limit 50] [--recursive]
 *   pnpm ingest -- pages --type weapon --recursive
 *   pnpm ingest -- media --type character [--slug anemone]   # download images into data/media
 *   pnpm ingest -- build-seed                          # merge data/wiki/* into data/seed/ingested/*.json
 *
 * Output lives in data/wiki (normalized JSON + raw wikitext + manifest of revision ids),
 * so re-runs only fetch pages whose revision changed.
 *
 * The wiki is a volunteer project: this tool makes one request per second by default.
 * Run it from your own machine (the sandboxed environments used to build this project
 * cannot reach fandom.com at all).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { DEFAULT_CATEGORIES, type EntityKind, MAPPERS } from './mappers'
import { slugify } from './normalize'
import { WikiClient } from './wiki/client'
import { parseWikitext } from './wiki/parse'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const WIKI_DIR = path.join(ROOT, 'data', 'wiki')
const MEDIA_DIR = path.join(ROOT, 'data', 'media')
const SEED_DIR = path.join(ROOT, 'data', 'seed', 'ingested')

const KIND_TO_BUNDLE: Record<EntityKind, string> = {
  character: 'characters',
  weapon: 'weapons',
  map: 'maps',
  scenario: 'scenarios',
}

type Manifest = Record<
  string,
  { title: string; revisionId: number; fetchedAt: string; kind: EntityKind }
>

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    type: { type: 'string', short: 't' },
    title: { type: 'string' },
    category: { type: 'string', short: 'c', multiple: true },
    slug: { type: 'string' },
    limit: { type: 'string', short: 'l' },
    recursive: { type: 'boolean', short: 'r', default: false },
    force: { type: 'boolean', short: 'f', default: false },
    'dry-run': { type: 'boolean', default: false },
    delay: { type: 'string', default: '1100' },
    verbose: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const command = positionals[0]
const client = new WikiClient({ minDelayMs: Number(values.delay), verbose: values.verbose })

const readJson = async <T>(file: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch {
    return fallback
  }
}
const writeJson = async (file: string, data: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const assertKind = (kind: string | undefined): EntityKind => {
  if (!kind || !(kind in MAPPERS))
    throw new Error(`--type must be one of ${Object.keys(MAPPERS).join(', ')}`)
  return kind as EntityKind
}

async function ingestTitles(kind: EntityKind, titles: string[], dryRun: boolean, force: boolean) {
  const manifestFile = path.join(WIKI_DIR, 'manifest.json')
  const manifest = await readJson<Manifest>(manifestFile, {})
  const pages = await client.pages(titles)
  let written = 0
  let skipped = 0
  for (const page of pages) {
    if (page.missing) {
      console.error(`  ✗ missing: ${page.title}`)
      continue
    }
    const key = `${kind}:${page.title}`
    if (!force && manifest[key]?.revisionId === page.revisionId) {
      skipped += 1
      continue
    }
    const parsed = parseWikitext(page.title, page.wikitext)
    const files = parsed.images.map((i) => i.file)
    const images = files.length && !dryRun ? await client.imageInfo(files.slice(0, 60)) : []
    const mapped = MAPPERS[kind](parsed, images, client.pageUrl(page.title))
    mapped.data.wikiSource = {
      ...mapped.data.wikiSource!,
      revisionId: page.revisionId,
      fetchedAt: new Date().toISOString(),
    }
    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            title: page.title,
            infoboxTemplate: parsed.infoboxTemplate,
            infobox: parsed.infobox,
            mapped: mapped.data,
            unmapped: mapped.unmapped,
          },
          null,
          2,
        ),
      )
      continue
    }
    await fs.mkdir(path.join(WIKI_DIR, 'raw'), { recursive: true })
    await fs.writeFile(path.join(WIKI_DIR, 'raw', `${mapped.slug}.wikitext`), page.wikitext, 'utf8')
    await writeJson(path.join(WIKI_DIR, KIND_TO_BUNDLE[kind], `${mapped.slug}.json`), {
      ...mapped.data,
      _unmapped: mapped.unmapped,
    })
    manifest[key] = {
      title: page.title,
      revisionId: page.revisionId,
      fetchedAt: new Date().toISOString(),
      kind,
    }
    written += 1
    console.error(
      `  ✓ ${kind} ${mapped.slug} (rev ${page.revisionId})${Object.keys(mapped.unmapped).length ? ` — ${Object.keys(mapped.unmapped).length} unmapped infobox keys` : ''}`,
    )
  }
  if (!dryRun) await writeJson(manifestFile, manifest)
  console.error(`done: ${written} written, ${skipped} unchanged, ${pages.length} fetched`)
}

async function main() {
  if (values.help || !command) {
    console.log(
      await fs
        .readFile(fileURLToPath(import.meta.url), 'utf8')
        .then((s) => s.split('*/')[0]!.replace(/^\/\*\*|^ \* ?/gm, '')),
    )
    return
  }

  switch (command) {
    case 'categories': {
      const q = await client.api<{
        query?: { allcategories?: { category: string; size: number }[] }
      }>({
        action: 'query',
        list: 'allcategories',
        acprop: 'size',
        acmin: 5,
        aclimit: 500,
      })
      for (const c of q.query?.allcategories ?? [])
        console.log(`${String(c.size).padStart(5)}  ${c.category}`)
      return
    }
    case 'page': {
      const kind = assertKind(values.type)
      if (!values.title) throw new Error('--title is required')
      await ingestTitles(kind, [values.title], values['dry-run'], true)
      return
    }
    case 'pages': {
      const kind = assertKind(values.type)
      const categories = values.category?.length ? values.category : DEFAULT_CATEGORIES[kind]
      const titles = new Set<string>()
      for (const cat of categories) {
        console.error(`listing Category:${cat}${values.recursive ? ' (recursive)' : ''}…`)
        for (const t of await client.categoryMembers(cat, { recursive: values.recursive }))
          titles.add(t)
      }
      const list = [...titles].slice(0, values.limit ? Number(values.limit) : undefined)
      console.error(`${list.length} pages to ingest as ${kind}`)
      await ingestTitles(kind, list, values['dry-run'], values.force)
      return
    }
    case 'media': {
      const kind = assertKind(values.type)
      const dir = path.join(WIKI_DIR, KIND_TO_BUNDLE[kind])
      const files = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json'))
      const attribution: Record<string, unknown>[] = []
      for (const file of files) {
        const slug = file.replace(/\.json$/, '')
        if (values.slug && values.slug !== slug) continue
        const entity = await readJson<{
          media?: { src: string; kind: string; caption?: { en?: string }; sourceUrl?: string }[]
        }>(path.join(dir, file), {})
        for (const m of entity.media ?? []) {
          const name = decodeURIComponent(m.src.split('/').pop() ?? 'asset').replace(
            /[^\w.-]+/g,
            '_',
          )
          const target = path.join(MEDIA_DIR, KIND_TO_BUNDLE[kind], slug, name)
          try {
            await fs.access(target)
            continue
          } catch {
            /* not downloaded yet */
          }
          const res = await fetch(m.src, {
            headers: { 'User-Agent': 'CSOW-ingest/0.1 (fan archive)' },
          })
          if (!res.ok) {
            console.error(`  ✗ ${res.status} ${m.src}`)
            continue
          }
          await fs.mkdir(path.dirname(target), { recursive: true })
          await fs.writeFile(target, Buffer.from(await res.arrayBuffer()))
          attribution.push({
            file: path.relative(ROOT, target),
            source: m.sourceUrl ?? m.src,
            caption: m.caption?.en,
            license: 'Fair use — © Nexon; via Counter-Strike Online Wiki',
          })
          console.error(`  ✓ ${path.relative(ROOT, target)}`)
          await new Promise((r) => setTimeout(r, Number(values.delay)))
        }
      }
      const attrFile = path.join(MEDIA_DIR, 'ATTRIBUTION.json')
      const existing = await readJson<Record<string, unknown>[]>(attrFile, [])
      await writeJson(attrFile, [...existing, ...attribution])
      return
    }
    case 'build-seed': {
      for (const [kind, bundle] of Object.entries(KIND_TO_BUNDLE)) {
        const dir = path.join(WIKI_DIR, bundle)
        const files = (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith('.json'))
        const items = []
        for (const f of files) {
          const { _unmapped, ...rest } = await readJson<Record<string, unknown>>(
            path.join(dir, f),
            {},
          )
          items.push(rest)
        }
        if (items.length) {
          await writeJson(path.join(SEED_DIR, `${bundle}.json`), items)
          console.error(`  ✓ ${bundle}: ${items.length} ${kind}(s)`)
        }
      }
      console.error(
        'run `pnpm seed` to load the ingested bundle (curated data/seed entries win on conflicts)',
      )
      return
    }
    default:
      throw new Error(`unknown command "${command}" — try --help`)
  }
}

main().catch((err) => {
  console.error(`[ingest] ${(err as Error).message}`)
  process.exitCode = 1
})

export { slugify }
