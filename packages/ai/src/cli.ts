#!/usr/bin/env node
/**
 * @csow/ai — enrich, translate, illustrate and embed the world.
 *
 *   pnpm ai -- enrich    --type characters [--slug anemone] [--limit 5] [--premium] [--dry-run]
 *   pnpm ai -- translate --type characters --to vi [--slug anemone] [--limit 5] [--dry-run]
 *   pnpm ai -- art       --type characters --slug anemone [--variant hero|portrait|action] [--provider fal|openai|google|replicate] [--reference <url>] [--seed 7]
 *   pnpm ai -- figure    --slug anemone --image <url-or-path>      # image → GLB via fal.ai
 *   pnpm ai -- embed     --type characters [--type weapons ...]    # semantic search vectors → data/ai/embeddings.json
 *   pnpm ai -- status                                            # which providers have keys
 *
 * Output goes to data/seed/ai/<type>.json (text overlays merged by `pnpm seed`; curated data wins)
 * and data/media/generated/<type>/<slug>/ (images, GLBs, with provenance JSON next to each file).
 *
 * Guardrails: nothing runs without --slug or --limit; --dry-run prints prompts and token estimates.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import type { CharacterSeed, Locale, WeaponSeed } from '@csow/schema'
import { DEFAULTS, hasKey, type ImageProvider } from './config'
import { embedDocuments } from './embeddings'
import { generateArt } from './images'
import { characterPrompt, weaponPrompt } from './prompts'
import { enrich, translateRecord } from './text'
import { generateFigure } from './three-d'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const SEED_DIR = path.join(ROOT, 'data', 'seed')
const AI_SEED_DIR = path.join(SEED_DIR, 'ai')
const GENERATED_DIR = path.join(ROOT, 'data', 'media', 'generated')
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
      for (const [name, check] of Object.entries(hasKey))
        console.log(`${check() ? '✓' : '·'} ${name}`)
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
  console.error(`[ai] ${(err as Error).message}`)
  process.exitCode = 1
})
