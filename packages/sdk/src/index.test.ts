import { describe, expect, it, vi } from 'vitest'
import { CsowApiError, CsowClient } from './index'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('CsowClient', () => {
  it('builds list URLs with locale and filters', async () => {
    const fetch = vi.fn(async () =>
      json({
        data: [],
        meta: {
          page: 1,
          limit: 24,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        links: { self: '', next: null, prev: null },
      }),
    )
    const client = new CsowClient({ baseUrl: 'https://example.test/', locale: 'vi', fetch })
    await client.characters.list({ side: 'tr', grade: 'transcendent', limit: 5 })
    const url = (fetch.mock.calls[0] as unknown as [string])[0]
    expect(url).toBe(
      'https://example.test/api/v1/characters?locale=vi&side=tr&grade=transcendent&limit=5',
    )
  })

  it('unwraps detail responses', async () => {
    const fetch = vi.fn(async () => json({ data: { slug: 'anemone', name: 'Anemone' } }))
    const client = new CsowClient({ baseUrl: 'https://example.test', fetch })
    const doc = await client.characters.get('anemone')
    expect(doc.name).toBe('Anemone')
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://example.test/api/v1/characters/anemone?locale=en',
    )
  })

  it('throws CsowApiError with the server code', async () => {
    const fetch = vi.fn(async () =>
      json({ error: { code: 'NOT_FOUND', message: 'Characters "nope" not found' } }, 404),
    )
    const client = new CsowClient({ baseUrl: 'https://example.test', fetch })
    await expect(client.characters.get('nope')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    })
    await expect(client.characters.get('nope')).rejects.toBeInstanceOf(CsowApiError)
  })

  it('iterates across pages', async () => {
    const pages = [
      {
        data: [{ slug: 'a' }],
        meta: {
          page: 1,
          limit: 1,
          totalItems: 2,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        },
        links: { self: '', next: '', prev: null },
      },
      {
        data: [{ slug: 'b' }],
        meta: {
          page: 2,
          limit: 1,
          totalItems: 2,
          totalPages: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
        links: { self: '', next: null, prev: '' },
      },
    ]
    let i = 0
    const fetch = vi.fn(async () => json(pages[i++]))
    const client = new CsowClient({ baseUrl: 'https://example.test', fetch })
    const slugs: string[] = []
    for await (const w of client.weapons.iterate({ limit: 1 })) slugs.push(w.slug)
    expect(slugs).toEqual(['a', 'b'])
  })
})
