import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { app } from '@/api/v1/app'
import config from '@/payload.config'

/**
 * Integration tests run against a throwaway SQLite file (see vitest.config.mts)
 * and exercise the real Payload Local API plus the Hono API app in-process.
 */
let payload: Payload
const slug = 'test-operator'

describe('world + api/v1', () => {
  beforeAll(async () => {
    payload = await getPayload({ config })
    await payload.delete({ collection: 'characters', where: { slug: { equals: slug } } })
    await payload.create({
      collection: 'characters',
      data: {
        name: 'Test Operator',
        slug,
        kind: 'human',
        side: 'ct',
        grade: 'epic',
        tagline: 'A fixture, not a legend.',
        summary: 'Exists only while the tests run.',
        aliases: [{ alias: 'Fixture' }],
        remoteMedia: [{ url: 'https://example.test/render.png', kind: 'render', credit: 'test' }],
        _status: 'published',
      },
      locale: 'en',
    })
  })

  afterAll(async () => {
    await payload.delete({ collection: 'characters', where: { slug: { equals: slug } } })
    await payload.destroy()
  })

  it('serves the API index with counts', async () => {
    const res = await app.request('/api/v1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { version: string; counts: Record<string, number> }
    expect(body.version).toBe('v1')
    expect(body.counts.characters).toBeGreaterThanOrEqual(1)
  })

  it('returns a published character by slug with resolved media and href', async () => {
    const res = await app.request(`/api/v1/characters/${slug}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('s-maxage')
    const { data } = (await res.json()) as { data: Record<string, unknown> }
    expect(data.name).toBe('Test Operator')
    expect(data.grade).toBe('epic')
    expect(data.href).toBe(`/characters/${slug}`)
    expect((data.heroImage as { url: string }).url).toBe('https://example.test/render.png')
    expect(data.aliases).toEqual(['Fixture'])
  })

  it('lists with filters and pagination metadata', async () => {
    const res = await app.request('/api/v1/characters?side=ct&limit=1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      data: unknown[]
      meta: { limit: number; totalItems: number }
    }
    expect(body.meta.limit).toBe(1)
    expect(body.meta.totalItems).toBeGreaterThanOrEqual(1)
    expect(body.data).toHaveLength(1)
  })

  it('validates query parameters', async () => {
    const res = await app.request('/api/v1/characters?limit=999')
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('404s unknown slugs with the error envelope', async () => {
    const res = await app.request('/api/v1/weapons/does-not-exist')
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string } }
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('searches across the world', async () => {
    const res = await app.request('/api/v1/search?q=Fixture')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { slug: string; type: string }[] }
    expect(body.data.some((h) => h.slug === slug && h.type === 'characters')).toBe(true)
  })

  it('exposes an OpenAPI 3.1 document', async () => {
    const res = await app.request('/api/v1/openapi.json')
    expect(res.status).toBe(200)
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(doc.openapi).toBe('3.1.0')
    expect(Object.keys(doc.paths)).toContain('/api/v1/characters/{slug}')
  })
})
