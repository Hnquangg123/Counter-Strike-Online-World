#!/usr/bin/env node
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import type { CharacterSeed, Locale, MediaInput, WeaponSeed } from '@csow/schema'
import { DEFAULTS, hasKey, type ImageProvider } from './config'
import { embedDocuments } from './embeddings'
/**
 * @csow/ai — enrich, translate, illustrate and embed the world.
 *
 *   pnpm ai -- enrich    --type characters [--slug anemone] [--limit 5] [--premium] [--dry-run]
 *   pnpm ai -- translate --type characters --to vi [--slug anemone] [--limit 5] [--dry-run]
 *   pnpm ai -- art       --type characters --slug anemone [--variant hero|portrait|action] [--provider fal|openai|google|replicate] [--reference <url>] [--seed 7]
 *   pnpm ai -- figure    --slug anemone --image <url-or-path>      # image → GLB via fal.ai
 *   pnpm ai -- restore   --type characters --slug anemone [--kind portrait|render|icon] [--all] [--upscale] [--factor 4] [--source <url-or-path>] [--force] [--dry-run]
 *                        # RESTORE track: wiki capture → [upscale] → background removal → trimmed transparent PNG (canon, not generated)
 *   pnpm ai -- embed     --type characters [--type weapons ...]    # semantic search vectors → data/ai/embeddings.json
 *   pnpm ai -- status                                            # which providers have keys
 *
 * Output goes to data/seed/ai/<type>.json (text overlays merged by `pnpm seed`; curated data wins),
 * data/media/generated/<type>/<slug>/ (images, GLBs, with provenance JSON next to each file) and
 * data/media/restored/<type>/<slug>/ (cleaned-up wiki assets). See docs/MEDIA_PIPELINE.md.
 *
 * Guardrails: nothing runs without --slug or --limit; --dry-run prints prompts and token estimates.
 */
// Load apps/web/.env (and friends) before config.ts evaluates its defaults.
import { ENV_CANDIDATES, loadedEnvFiles } from './env'
import { generateArt } from './images'
import { characterPrompt, weaponPrompt } from './prompts'
import { originalWikiUrl, restoredCredit, restoreImage } from './restore'
import { enrich, translateRecord } from './text'
import { generateFigure } from './three-d'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SEED_DIR = path.join(ROOT, 'data', 'seed')
const AI_SEED_DIR = path.join(SEED_DIR, 'ai')
const GENERATED_DIR = path.join(ROOT, 'data', 'media', 'generated')
const RESTORED_DIR = path.join(ROOT, 'data', 'media', 'restored')
const AI_DATA_DIR = path.join(ROOT, 'data', 'ai')

type Entity = Record<string, unknown> & { slug: string; name: string }

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    type: { type: 'string', short: 't', multiple: true },
    slug: { type: 'string', short: 's' },
    limit: { type: 'string', short: 'l' },
    to: { type: 'string', default: 'vi' },
    variant: { type: 'string', default: 'hero' },
    provider: { type: 'string', short: 'p' },
    model: { type: 'string', short: 'm' },
    reference: { type: 'string', multiple: true },
    image: { type: 'string' },
    seed: { type: 'string' },
    kind: { type: 'string' },
    source: { type: 'string' },
    factor: { type: 'string' },
    all: { type: 'boolean', default: false },
    upscale: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    premium: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})
const command = positionals[0]

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

/** Curated + ingested + ai overlays, merged by slug (curated wins). */
async function loadEntities(type: string): Promise<Entity[]> {
  const layers = await Promise.all([
    readJson<Entity[]>(path.join(SEED_DIR, `${type}.json`), []),
    readJson<Entity[]>(path.join(SEED_DIR, 'ingested', `${type}.json`), []),
    readJson<Entity[]>(path.join(AI_SEED_DIR, `${type}.json`), []),
  ])
  const bySlug = new Map<string, Entity>()
  for (const layer of layers)
    for (const e of layer) bySlug.set(e.slug, { ...e, ...bySlug.get(e.slug) })
  return [...bySlug.values()]
}

async function upsertOverlay(type: string, slug: string, patch: Record<string, unknown>) {
  const file = path.join(AI_SEED_DIR, `${type}.json`)
  const items = await readJson<Entity[]>(file, [])
  const idx = items.findIndex((e) => e.slug === slug)
  const base = idx >= 0 ? items[idx]! : ({ slug, name: String(patch.name ?? slug) } as Entity)
  const merged = { ...base, ...patch, slug }
  if (idx >= 0) items[idx] = merged
  else items.push(merged)
  await writeJson(file, items)
}

async function readOverlay(type: string, slug: string): Promise<Entity | undefined> {
  const items = await readJson<Entity[]>(path.join(AI_SEED_DIR, `${type}.json`), [])
  return items.find((e) => e.slug === slug)
}

const shortHash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 8)

const selectTargets = (entities: Entity[]) => {
  if (values.slug) {
    const hit = entities.find((e) => e.slug === values.slug)
    if (!hit) throw new Error(`no entity with slug "${values.slug}"`)
    return [hit]
  }
  if (!values.limit)
    throw new Error(
      'refusing to run over the whole collection without --limit (cost guardrail); pass --slug or --limit',
    )
  return entities.slice(0, Number(values.limit))
}

const requireTypes = () => {
  if (!values.type?.length)
    throw new Error(
      '--type is required (characters, weapons, scenarios, game-modes, factions, maps, music)',
    )
  return values.type
}

const estimateTokens = (text: string) => Math.ceil(text.length / 3.6)

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
    case 'status': {
      console.log(
        'env files loaded:',
        loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none found)',
      )
      if (!loadedEnvFiles.length)
        console.log(`  looked in: ${ENV_CANDIDATES.map((f) => path.relative(ROOT, f)).join(', ')}`)
      console.log('')
      for (const [name, check] of Object.entries(hasKey))
        console.log(`${check() ? '✓' : '·'} ${name}${check() ? '' : '  (no key)'}`)
      console.log('\ndefaults:', JSON.stringify(DEFAULTS, null, 2))
      return
    }

    case 'enrich': {
      for (const type of requireTypes()) {
        const targets = selectTargets(await loadEntities(type))
        for (const e of targets) {
          const input = {
            kind: type,
            name: e.name,
            tagline: (e.tagline as { en?: string } | undefined)?.en,
            summary: (e.summary as { en?: string } | undefined)?.en,
            story: ((e.story ?? e.description ?? e.lore) as { en?: string } | undefined)?.en,
            facts: Object.fromEntries(
              Object.entries(e).filter(
                ([k, v]) =>
                  [
                    'kind',
                    'side',
                    'grade',
                    'classType',
                    'category',
                    'origin',
                    'season',
                    'chapter',
                    'family',
                    'profile',
                    'stats',
                    'ammo',
                  ].includes(k) && v !== undefined,
              ),
            ),
          }
          if (values['dry-run']) {
            console.log(
              `— ${type}/${e.slug}: ~${estimateTokens(JSON.stringify(input))} input tokens`,
            )
            continue
          }
          const { result, usage } = await enrich(input, {
            premium: values.premium,
            provider: values.provider as never,
            model: values.model,
          })
          await upsertOverlay(type, e.slug, {
            name: e.name,
            tagline: { en: result.tagline },
            summary: { en: result.summary },
            ...(input.story
              ? {
                  [e.story ? 'story' : e.description ? 'description' : 'lore']: {
                    en: result.story,
                  },
                }
              : {}),
            tags: result.tags,
            _ai: {
              enrichedAt: new Date().toISOString(),
              model:
                values.model ?? (values.premium ? DEFAULTS.text.premiumModel : DEFAULTS.text.model),
              seoDescription: result.seoDescription,
              hooks: result.hooks,
            },
          })
          console.error(
            `✓ enriched ${type}/${e.slug} (${usage.inputTokens ?? '?'} in / ${usage.outputTokens ?? '?'} out)`,
          )
        }
      }
      return
    }

    case 'translate': {
      const locale = values.to as Locale
      for (const type of requireTypes()) {
        const targets = selectTargets(await loadEntities(type))
        for (const e of targets) {
          const strings: Record<string, string> = {}
          for (const key of [
            'tagline',
            'summary',
            'story',
            'description',
            'lore',
            'obtainMethod',
          ]) {
            const v = e[key] as { en?: string; [k: string]: string | undefined } | undefined
            if (v?.en && !v[locale]) strings[key] = v.en
          }
          const quotes = (e.quotes as { text: { en: string } }[] | undefined) ?? []
          quotes.forEach((q, i) => {
            strings[`quote.${i}`] = q.text.en
          })
          const abilities =
            (e.abilities as
              | { name: { en: string }; description?: { en?: string } }[]
              | undefined) ?? []
          abilities.forEach((a, i) => {
            strings[`ability.${i}.name`] = a.name.en
            if (a.description?.en) strings[`ability.${i}.description`] = a.description.en
          })
          if (!Object.keys(strings).length) continue
          if (values['dry-run']) {
            console.log(
              `— ${type}/${e.slug}: ${Object.keys(strings).length} strings, ~${estimateTokens(JSON.stringify(strings))} input tokens`,
            )
            continue
          }
          const { result, usage } = await translateRecord(strings, locale, {
            provider: values.provider as never,
            model: values.model,
          })
          const patch: Record<string, unknown> = { name: e.name }
          for (const key of [
            'tagline',
            'summary',
            'story',
            'description',
            'lore',
            'obtainMethod',
          ]) {
            if (result[key]) patch[key] = { ...(e[key] as object), [locale]: result[key] }
          }
          if (quotes.length)
            patch.quotes = quotes.map((q, i) => ({
              ...q,
              text: { ...q.text, [locale]: result[`quote.${i}`] ?? q.text.en },
            }))
          if (abilities.length)
            patch.abilities = abilities.map((a, i) => ({
              ...a,
              name: { ...a.name, [locale]: result[`ability.${i}.name`] ?? a.name.en },
              ...(a.description
                ? {
                    description: {
                      ...a.description,
                      [locale]: result[`ability.${i}.description`] ?? a.description.en,
                    },
                  }
                : {}),
            }))
          await upsertOverlay(type, e.slug, patch)
          console.error(
            `✓ translated ${type}/${e.slug} → ${locale} (${usage.inputTokens ?? '?'} in / ${usage.outputTokens ?? '?'} out)`,
          )
        }
      }
      return
    }

    case 'art': {
      const [type] = requireTypes()
      const targets = selectTargets(await loadEntities(type!))
      for (const e of targets) {
        const spec =
          type === 'weapons'
            ? weaponPrompt(
                e as unknown as WeaponSeed,
                values.variant === 'hero' ? 'hero' : 'profile',
              )
            : characterPrompt(
                e as unknown as CharacterSeed,
                values.variant as 'hero' | 'portrait' | 'action',
              )
        if (values['dry-run']) {
          console.log(`— ${type}/${e.slug}\n${spec.prompt}\n`)
          continue
        }
        const outDir = path.join(GENERATED_DIR, type!, e.slug)
        const baseName = `${values.variant}-${Date.now()}`
        const { files, generation } = await generateArt(
          {
            ...spec,
            provider: values.provider as ImageProvider | undefined,
            model: values.model,
            seed: values.seed ? Number(values.seed) : undefined,
            referenceImages: values.reference,
          },
          outDir,
          baseName,
        )
        await writeJson(path.join(outDir, `${baseName}.json`), generation)
        const rel = files.map((f) => path.relative(ROOT, f.path))
        await upsertOverlay(type!, e.slug, {
          name: e.name,
          media: [
            ...((e.media as unknown[]) ?? []),
            ...rel.map((p) => ({
              kind: values.variant === 'portrait' ? 'portrait' : 'render',
              src: p,
              credit: 'Counter-Strike Online World (AI-generated)',
              aiGeneration: generation,
            })),
          ],
        })
        console.error(`✓ ${type}/${e.slug}: ${rel.join(', ')}`)
      }
      return
    }

    case 'figure': {
      if (!values.slug || !values.image) throw new Error('--slug and --image are required')
      const outDir = path.join(GENERATED_DIR, 'figures', values.slug)
      const res = await generateFigure(
        values.image,
        outDir,
        `${values.slug}-${Date.now()}`,
        values.model,
      )
      await writeJson(`${res.path}.json`, { ...res, generatedAt: new Date().toISOString() })
      console.error(
        `✓ figure ${path.relative(ROOT, res.path)} (${Math.round(res.bytes / 1024)} KB)`,
      )
      return
    }

    case 'restore': {
      const [type] = requireTypes()
      const RESTORABLE = ['portrait', 'render', 'icon'] as const
      const wantedKinds = values.kind ? [values.kind] : [...RESTORABLE]
      const entities = await loadEntities(type!)
      const targets = values.source
        ? [
            entities.find((e) => e.slug === values.slug) ??
              ({ slug: values.slug ?? '', name: values.slug ?? '' } as Entity),
          ]
        : selectTargets(entities)
      if (values.source && !values.slug) throw new Error('--source needs --slug')

      for (const e of targets) {
        const media = (e.media as MediaInput[] | undefined) ?? []
        const alreadyRestored = new Set(
          media
            .filter((m) => m.src.startsWith('data/media/restored/') && m.sourceUrl)
            .map((m) => originalWikiUrl(m.sourceUrl!)),
        )
        let candidates: MediaInput[] = values.source
          ? [{ kind: (values.kind ?? 'render') as MediaInput['kind'], src: values.source }]
          : media.filter((m) => /^https?:\/\//.test(m.src) && wantedKinds.includes(m.kind))
        if (!values.all && !values.source) {
          // One hero-grade image per entity: portrait beats render beats icon.
          const best = wantedKinds.map((k) => candidates.find((m) => m.kind === k)).find(Boolean)
          candidates = best ? [best] : []
        }
        if (!values.force)
          candidates = candidates.filter((m) => !alreadyRestored.has(originalWikiUrl(m.src)))
        if (!candidates.length) {
          console.error(
            `· ${type}/${e.slug}: nothing to restore (no remote ${wantedKinds.join('/')} image, or already restored — use --force)`,
          )
          continue
        }

        const outDir = path.join(RESTORED_DIR, type!, e.slug)
        const factor = values.factor ? Number(values.factor) : 4
        for (const m of candidates) {
          const baseName = `${e.slug}-${m.kind}-${shortHash(originalWikiUrl(m.src))}`
          if (values['dry-run']) {
            console.log(
              `— ${type}/${e.slug} [${m.kind}] ${m.src}\n    → ${path.relative(ROOT, path.join(outDir, `${baseName}.png`))}${values.upscale ? ` (upscale ×${factor})` : ''}`,
            )
            continue
          }
          const result = await restoreImage({
            source: m.src,
            outDir,
            baseName,
            upscale: values.upscale,
            upscaleFactor: factor,
          })
          await writeJson(path.join(outDir, `${baseName}.json`), {
            ...result,
            path: path.relative(ROOT, result.path),
            sourcePath: path.relative(ROOT, result.sourcePath),
            entity: { type, slug: e.slug, name: e.name },
            kind: m.kind,
          })
          const rel = path.relative(ROOT, result.path).split(path.sep).join('/')
          const overlay = await readOverlay(type!, e.slug)
          const overlayMedia = ((overlay?.media as MediaInput[] | undefined) ?? []).filter(
            (x) => x.src !== rel,
          )
          await upsertOverlay(type!, e.slug, {
            name: e.name,
            media: [
              ...overlayMedia,
              {
                kind: m.kind,
                src: rel,
                alt: m.alt ?? e.name,
                credit: restoredCredit(result.steps, factor),
                sourceUrl: originalWikiUrl(m.src),
              },
            ],
          })
          const seconds = (result.steps.reduce((n, st) => n + st.ms, 0) / 1000).toFixed(1)
          console.error(
            `✓ restored ${type}/${e.slug} [${m.kind}] ${result.sourceWidth ?? '?'}×${result.sourceHeight ?? '?'} → ${result.width}×${result.height} in ${seconds}s → ${rel}`,
          )
        }
      }
      console.error('\nrun `pnpm seed` to upload restored images into the media library.')
      return
    }

    case 'embed': {
      const docs: { id: string; text: string }[] = []
      for (const type of requireTypes()) {
        for (const e of await loadEntities(type)) {
          const text = [
            e.name,
            (e.tagline as { en?: string })?.en,
            (e.summary as { en?: string })?.en,
            ((e.story ?? e.description ?? e.lore) as { en?: string })?.en,
          ]
            .filter(Boolean)
            .join('\n')
            .slice(0, 6000)
          docs.push({ id: `${type}/${e.slug}`, text })
        }
      }
      if (values['dry-run']) {
        console.log(
          `${docs.length} documents, ~${docs.reduce((n, d) => n + estimateTokens(d.text), 0)} tokens`,
        )
        return
      }
      const embedded = await embedDocuments(docs, {
        provider: values.provider as never,
        model: values.model,
      })
      await writeJson(path.join(AI_DATA_DIR, 'embeddings.json'), {
        model: values.model ?? DEFAULTS.embeddings.models[DEFAULTS.embeddings.provider],
        createdAt: new Date().toISOString(),
        docs: embedded,
      })
      console.error(`✓ embedded ${embedded.length} documents → data/ai/embeddings.json`)
      return
    }

    default:
      throw new Error(`unknown command "${command}" — try --help`)
  }
}

main().catch((err) => {
  const message = (err as Error).message
  console.error(`[ai] ${message}`)
  if (/api key|apiKey|credentials|401|403/i.test(message)) {
    console.error(
      `[ai] env files loaded: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'} — put your keys in apps/web/.env and run \`pnpm ai -- status\` to verify.`,
    )
  }
  process.exitCode = 1
})
