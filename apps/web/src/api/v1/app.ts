import {
  API_VERSION,
  ApiError,
  CharacterKind,
  CharacterPublic,
  FactionPublic,
  GameModePublic,
  Grade,
  Locale,
  MapPublic,
  ModeFamily,
  MusicPublic,
  PaginationQuery,
  paginated,
  ScenarioPublic,
  SearchHit,
  SearchQuery,
  Side,
  Slug,
  WeaponCategory,
  WeaponPublic,
} from '@csow/schema'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import type { Context } from 'hono'
import type { Where } from 'payload'
import type { EntityType } from '@/lib/href'
import { getPayloadClient } from '@/lib/payload'
import {
  getEntityBySlug,
  listEntities,
  searchWorld,
  toCharacterPublic,
  toFactionPublic,
  toGameModePublic,
  toMapPublic,
  toMusicPublic,
  toScenarioPublic,
  toWeaponPublic,
} from '@/lib/world'
import type { GameMode } from '@/payload-types'

const BASE = `/api/${API_VERSION}`
const CACHE = 'public, s-maxage=300, stale-while-revalidate=86400'

const app = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request',
            details: result.error.issues,
          },
        },
        400,
      )
    }
  },
}).basePath(BASE)

app.use('*', async (c, next) => {
  await next()
  c.header('X-CSOW-API-Version', API_VERSION)
  if (c.req.method === 'GET' && c.res.status === 200) c.header('Cache-Control', CACHE)
})

app.notFound((c) =>
  c.json({ error: { code: 'NOT_FOUND', message: `No route for ${c.req.path}` } }, 404),
)
app.onError((err, c) => {
  console.error('[api/v1]', err)
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong in the world.' } },
    500,
  )
})

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const notFound = (c: Context, what: string) =>
  c.json({ error: { code: 'NOT_FOUND', message: `${what} not found` } }, 404)

const links = (c: Context, page: number, totalPages: number) => {
  const url = new URL(c.req.url)
  const at = (p: number) => {
    const u = new URL(url)
    u.searchParams.set('page', String(p))
    return `${u.pathname}${u.search}`
  }
  return {
    self: `${url.pathname}${url.search}`,
    next: page < totalPages ? at(page + 1) : null,
    prev: page > 1 ? at(page - 1) : null,
  }
}

const ErrorResponses = {
  400: { description: 'Validation error', content: { 'application/json': { schema: ApiError } } },
  404: { description: 'Not found', content: { 'application/json': { schema: ApiError } } },
} as const

const SlugParam = z.object({ slug: Slug })
const LocaleQuery = z.object({ locale: Locale.default('en') })

type Mapper<TDoc, TPublic> = (doc: TDoc, locale: Locale) => Promise<TPublic>

/**
 * Registers `GET /{path}` (paginated list) and `GET /{path}/{slug}` for one
 * entity type. `filterShape` adds entity-specific query params, mapped to a
 * Payload `where` clause by `filters`.
 *
 * The factory is generic over the Zod schema, which is more than TypeScript can
 * resolve through Hono's conditional response types — hence the two `as never`
 * casts on the JSON responses. The OpenAPI document and runtime validation are
 * fully derived from the concrete schemas, so nothing is lost for consumers.
 */
function registerEntity<TDoc, TPublic extends z.ZodType, TFilter extends z.ZodRawShape>({
  type,
  path,
  tag,
  schema,
  map,
  filterShape,
  filters,
}: {
  type: EntityType
  path: string
  tag: string
  schema: TPublic
  map: Mapper<TDoc, z.output<TPublic>>
  filterShape: TFilter
  filters: (q: Record<string, unknown>) => Where[]
}) {
  const ListQuery = PaginationQuery.extend(filterShape).extend({
    q: z.string().optional().meta({ description: 'Free-text filter on name/summary' }),
  })

  const listRoute = createRoute({
    method: 'get',
    path: `/${path}`,
    tags: [tag],
    summary: `List ${tag.toLowerCase()}`,
    request: { query: ListQuery },
    responses: {
      200: {
        description: `Paginated ${tag.toLowerCase()}`,
        content: { 'application/json': { schema: paginated(schema) } },
      },
      400: ErrorResponses[400],
    },
  })

  app.openapi(listRoute, async (c) => {
    // Base pagination fields are known; entity filters are read dynamically by `filters`.
    const q = c.req.valid('query') as unknown as z.infer<typeof PaginationQuery> & {
      q?: string
    } & Record<string, unknown>
    const and = filters(q)
    if (q.q)
      and.push({
        or: [{ name: { like: q.q } }, { title: { like: q.q } }, { summary: { like: q.q } }],
      } as Where)
    const { docs, meta } = await listEntities(type, {
      locale: q.locale,
      page: q.page,
      limit: q.limit,
      sort: q.sort,
      where: and.length ? { and } : undefined,
    })
    const data = await Promise.all((docs as TDoc[]).map((d) => map(d, q.locale)))
    return c.json({ data, meta, links: links(c, meta.page, meta.totalPages) }, 200) as never
  })

  const detailRoute = createRoute({
    method: 'get',
    path: `/${path}/{slug}`,
    tags: [tag],
    summary: `Get one of ${tag.toLowerCase()} by slug`,
    request: { params: SlugParam, query: LocaleQuery },
    responses: {
      200: {
        description: 'The entity',
        content: { 'application/json': { schema: z.object({ data: schema }) } },
      },
      ...ErrorResponses,
    },
  })

  app.openapi(detailRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const { locale } = c.req.valid('query')
    const doc = (await getEntityBySlug(type, slug, locale, 2)) as TDoc | null
    if (!doc) return notFound(c, `${tag} "${slug}"`) as never
    return c.json({ data: await map(doc, locale) }, 200) as never
  })
}

const eq = (field: string, value: unknown): Where[] =>
  value === undefined ? [] : [{ [field]: { equals: value } }]

/* -------------------------------------------------------------------------- */
/*  Entities                                                                   */
/* -------------------------------------------------------------------------- */

registerEntity({
  type: 'characters',
  path: 'characters',
  tag: 'Characters',
  schema: CharacterPublic,
  map: toCharacterPublic,
  filterShape: {
    side: Side.optional(),
    kind: CharacterKind.optional(),
    grade: Grade.optional(),
    featured: z.enum(['true', 'false']).optional(),
    faction: Slug.optional().meta({ description: 'Faction slug' }),
  },
  filters: (q) => [
    ...eq('side', q.side),
    ...eq('kind', q.kind),
    ...eq('grade', q.grade),
    ...(q.featured ? [{ featured: { equals: q.featured === 'true' } }] : []),
    ...(q.faction ? [{ 'factions.slug': { equals: q.faction } }] : []),
  ],
})

registerEntity({
  type: 'weapons',
  path: 'weapons',
  tag: 'Weapons',
  schema: WeaponPublic,
  map: toWeaponPublic,
  filterShape: {
    category: WeaponCategory.optional(),
    grade: Grade.optional(),
    featured: z.enum(['true', 'false']).optional(),
  },
  filters: (q) => [
    ...eq('category', q.category),
    ...eq('grade', q.grade),
    ...(q.featured ? [{ featured: { equals: q.featured === 'true' } }] : []),
  ],
})

registerEntity({
  type: 'scenarios',
  path: 'scenarios',
  tag: 'Scenarios',
  schema: ScenarioPublic,
  map: toScenarioPublic,
  filterShape: {
    season: z.string().optional(),
    gameMode: Slug.optional().meta({ description: 'Game mode slug' }),
  },
  filters: (q) => [
    ...eq('season', q.season),
    ...(q.gameMode ? [{ 'gameMode.slug': { equals: q.gameMode } }] : []),
  ],
})

registerEntity({
  type: 'game-modes',
  path: 'game-modes',
  tag: 'Game modes',
  schema: GameModePublic,
  map: (doc: GameMode, locale) => toGameModePublic(doc, locale),
  filterShape: { family: ModeFamily.optional() },
  filters: (q) => eq('family', q.family),
})

registerEntity({
  type: 'maps',
  path: 'maps',
  tag: 'Maps',
  schema: MapPublic,
  map: toMapPublic,
  filterShape: {},
  filters: () => [],
})

registerEntity({
  type: 'factions',
  path: 'factions',
  tag: 'Factions',
  schema: FactionPublic,
  map: toFactionPublic,
  filterShape: { side: Side.optional() },
  filters: (q) => eq('side', q.side),
})

registerEntity({
  type: 'music',
  path: 'music',
  tag: 'Music',
  schema: MusicPublic,
  map: toMusicPublic,
  filterShape: {},
  filters: () => [],
})

/* -------------------------------------------------------------------------- */
/*  Search                                                                     */
/* -------------------------------------------------------------------------- */

const searchRoute = createRoute({
  method: 'get',
  path: '/search',
  tags: ['Search'],
  summary: 'Search across the whole world',
  request: { query: SearchQuery },
  responses: {
    200: {
      description: 'Ranked hits',
      content: {
        'application/json': { schema: z.object({ data: z.array(SearchHit), query: z.string() }) },
      },
    },
    400: ErrorResponses[400],
  },
})

app.openapi(searchRoute, async (c) => {
  const { q, locale, limit, types } = c.req.valid('query')
  const typeList = types
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) as EntityType[] | undefined
  const data = await searchWorld({ q, locale, limit, types: typeList })
  return c.json({ data, query: q }, 200)
})

/* -------------------------------------------------------------------------- */
/*  Index, spec, docs                                                          */
/* -------------------------------------------------------------------------- */

const indexRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Meta'],
  summary: 'API index',
  responses: {
    200: {
      description: 'Version, counts and resource links',
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            version: z.string(),
            license: z.string(),
            attribution: z.string(),
            counts: z.record(z.string(), z.number()),
            resources: z.record(z.string(), z.string()),
            docs: z.string(),
            openapi: z.string(),
          }),
        },
      },
    },
  },
})

app.openapi(indexRoute, async (c) => {
  const payload = await getPayloadClient()
  const collections = [
    'characters',
    'weapons',
    'scenarios',
    'game-modes',
    'maps',
    'factions',
    'music',
  ] as const
  const counts = Object.fromEntries(
    await Promise.all(
      collections.map(
        async (col) =>
          [
            col,
            (await payload.count({ collection: col, overrideAccess: false })).totalDocs,
          ] as const,
      ),
    ),
  )
  return c.json(
    {
      name: 'Counter-Strike Online World API',
      version: API_VERSION,
      license: 'Data: CC BY-SA 3.0 (adapted from the Counter-Strike Online Wiki). Code: MIT.',
      attribution:
        'Unofficial fan project. Not affiliated with Nexon or Valve. Counter-Strike is a trademark of Valve Corporation.',
      counts,
      resources: Object.fromEntries(collections.map((col) => [col, `${BASE}/${col}`])),
      docs: `${BASE}/docs`,
      openapi: `${BASE}/openapi.json`,
    },
    200,
  )
})

app.doc31('/openapi.json', (c) => ({
  openapi: '3.1.0',
  info: {
    title: 'Counter-Strike Online World API',
    version: '1.0.0',
    description: [
      'The open archive of Counter-Strike Online: characters, weapons, scenarios, game modes, maps, factions and music.',
      '',
      'All text fields are returned in the requested `locale` (`en` or `vi`), falling back to English.',
      'Rich text (`story`, `description`, `lore`) is returned as Markdown.',
      '',
      '**Licence** — encyclopedic content is adapted from the Counter-Strike Online Wiki (CC BY-SA 3.0); please keep the `wikiSource` attribution when you republish. Game assets © Nexon; Counter-Strike is a trademark of Valve Corporation.',
    ].join('\n'),
    contact: { name: 'Counter-Strike Online World', url: new URL(c.req.url).origin },
    license: {
      name: 'CC BY-SA 3.0 (content) · MIT (code)',
      url: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  },
  servers: [{ url: new URL(c.req.url).origin, description: 'This deployment' }],
  tags: [
    { name: 'Characters' },
    { name: 'Weapons' },
    { name: 'Scenarios' },
    { name: 'Game modes' },
    { name: 'Maps' },
    { name: 'Factions' },
    { name: 'Music' },
    { name: 'Search' },
    { name: 'Meta' },
  ],
}))

app.get(
  '/docs',
  Scalar({
    url: `${BASE}/openapi.json`,
    pageTitle: 'CSOW API · Counter-Strike Online World',
    theme: 'deepSpace',
    darkMode: true,
    hideDarkModeToggle: true,
    defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
    metaData: { title: 'CSOW API', description: 'The open archive of Counter-Strike Online' },
    customCss: `
      :root, .dark-mode {
        --scalar-color-accent: #f58a07;
        --scalar-background-1: #07080a;
        --scalar-background-2: #0e1013;
        --scalar-background-3: #15181d;
        --scalar-border-color: rgba(232,228,218,0.08);
        --scalar-color-1: #e8e4da;
        --scalar-color-2: #9aa0a8;
        --scalar-color-3: #5c6470;
        --scalar-font: 'Barlow', system-ui, sans-serif;
        --scalar-font-code: 'Share Tech Mono', ui-monospace, monospace;
      }
      .sidebar-heading, .section-header { letter-spacing: 0.04em; text-transform: uppercase; }
    `,
  }),
)

export { app }
export type AppType = typeof app
