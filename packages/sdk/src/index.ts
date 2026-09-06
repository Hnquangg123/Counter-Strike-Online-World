/**
 * @csow/sdk — typed client for the Counter-Strike Online World public API (v1).
 *
 *   import { CsowClient } from '@csow/sdk'
 *   const csow = new CsowClient({ baseUrl: 'https://csow.world', locale: 'en' })
 *   const anemone = await csow.characters.get('anemone')
 *   for await (const weapon of csow.weapons.iterate({ category: 'assault-rifle' })) console.log(weapon.name)
 *
 * Content is CC BY-SA 3.0 (adapted from the Counter-Strike Online Wiki): keep
 * the `wikiSource` attribution when you republish it.
 */
import type {
  CharacterKind,
  CharacterPublic,
  FactionPublic,
  GameModePublic,
  Grade,
  Locale,
  MapPublic,
  ModeFamily,
  MusicPublic,
  PageMeta,
  ScenarioPublic,
  SearchHit,
  Side,
  WeaponCategory,
  WeaponPublic,
} from '@csow/schema'

export type {
  CharacterPublic,
  FactionPublic,
  GameModePublic,
  Locale,
  MapPublic,
  MusicPublic,
  PageMeta,
  ScenarioPublic,
  SearchHit,
  WeaponPublic,
} from '@csow/schema'

export const API_VERSION = 'v1'

export type ClientOptions = {
  /** Origin of the deployment, e.g. https://csow.world (no trailing slash). */
  baseUrl?: string
  /** Default locale for text fields. */
  locale?: Locale
  /** Custom fetch (e.g. for Node < 18 polyfills or request logging). */
  fetch?: typeof fetch
  /** Extra headers sent with every request. */
  headers?: Record<string, string>
  /** Default request timeout in ms (0 disables). */
  timeoutMs?: number
}

export type ListParams = {
  page?: number
  limit?: number
  locale?: Locale
  sort?: string
  /** Free-text filter on name/summary. */
  q?: string
}

export type Paginated<T> = {
  data: T[]
  meta: PageMeta
  links: { self: string; next: string | null; prev: string | null }
}

export type CharacterFilters = ListParams & {
  side?: Side
  kind?: CharacterKind
  grade?: Grade
  featured?: boolean
  faction?: string
}
export type WeaponFilters = ListParams & {
  category?: WeaponCategory
  grade?: Grade
  featured?: boolean
}
export type ScenarioFilters = ListParams & { season?: string; gameMode?: string }
export type GameModeFilters = ListParams & { family?: ModeFamily }
export type FactionFilters = ListParams & { side?: Side }

export type ApiIndex = {
  name: string
  version: string
  license: string
  attribution: string
  counts: Record<string, number>
  resources: Record<string, string>
  docs: string
  openapi: string
}

export class CsowApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'CsowApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } }

const toQuery = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

class Resource<T, F extends ListParams> {
  constructor(
    private readonly client: CsowClient,
    private readonly path: string,
  ) {}

  /** One page of results. */
  list(params: F = {} as F): Promise<Paginated<T>> {
    return this.client.request<Paginated<T>>(
      `/${this.path}${toQuery({ locale: this.client.locale, ...params })}`,
    )
  }

  /** A single entity by slug; throws CsowApiError(404) when missing. */
  async get(slug: string, options: { locale?: Locale } = {}): Promise<T> {
    const res = await this.client.request<{ data: T }>(
      `/${this.path}/${encodeURIComponent(slug)}${toQuery({ locale: options.locale ?? this.client.locale })}`,
    )
    return res.data
  }

  /** Walks every page lazily. */
  async *iterate(params: F = {} as F): AsyncGenerator<T, void, undefined> {
    let page = params.page ?? 1
    while (true) {
      const res = await this.list({ ...params, page })
      for (const item of res.data) yield item
      if (!res.meta.hasNextPage) return
      page += 1
    }
  }

  /** Every entity, materialised. Fine for this archive's size; prefer iterate() for streaming. */
  async all(params: F = {} as F): Promise<T[]> {
    const out: T[] = []
    for await (const item of this.iterate({ ...params, limit: params.limit ?? 100 })) out.push(item)
    return out
  }
}

export class CsowClient {
  readonly baseUrl: string
  readonly locale: Locale
  private readonly fetchImpl: typeof fetch
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number

  readonly characters: Resource<CharacterPublic, CharacterFilters>
  readonly weapons: Resource<WeaponPublic, WeaponFilters>
  readonly scenarios: Resource<ScenarioPublic, ScenarioFilters>
  readonly gameModes: Resource<GameModePublic, GameModeFilters>
  readonly maps: Resource<MapPublic, ListParams>
  readonly factions: Resource<FactionPublic, FactionFilters>
  readonly music: Resource<MusicPublic, ListParams>

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://csow.world').replace(/\/+$/, '')
    this.locale = options.locale ?? 'en'
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.headers = { Accept: 'application/json', ...options.headers }
    this.timeoutMs = options.timeoutMs ?? 15_000

    this.characters = new Resource(this, 'characters')
    this.weapons = new Resource(this, 'weapons')
    this.scenarios = new Resource(this, 'scenarios')
    this.gameModes = new Resource(this, 'game-modes')
    this.maps = new Resource(this, 'maps')
    this.factions = new Resource(this, 'factions')
    this.music = new Resource(this, 'music')
  }

  /** API index: version, counts and resource links. */
  index(): Promise<ApiIndex> {
    return this.request<ApiIndex>('')
  }

  /** Full-text search across every entity type. */
  async search(
    q: string,
    options: { locale?: Locale; limit?: number; types?: SearchHit['type'][] } = {},
  ): Promise<SearchHit[]> {
    const res = await this.request<{ data: SearchHit[] }>(
      `/search${toQuery({ q, locale: options.locale ?? this.locale, limit: options.limit, types: options.types?.join(',') })}`,
    )
    return res.data
  }

  /** Low-level request against /api/v1. */
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = this.timeoutMs > 0 ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), this.timeoutMs) : null
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/${API_VERSION}${path}`, {
        ...init,
        headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) },
        signal: controller?.signal ?? init.signal ?? null,
      })
      if (!res.ok) {
        let body: ErrorBody = {}
        try {
          body = (await res.json()) as ErrorBody
        } catch {
          /* non-JSON error */
        }
        throw new CsowApiError(
          res.status,
          body.error?.code ?? 'HTTP_ERROR',
          body.error?.message ?? res.statusText,
          body.error?.details,
        )
      }
      return (await res.json()) as T
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}

export const createClient = (options?: ClientOptions) => new CsowClient(options)
