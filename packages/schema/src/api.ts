import { z } from 'zod'
import { Locale } from './enums'

export const API_VERSION = 'v1' as const

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1).meta({ description: 'Page number (1-based)' }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(24)
    .meta({ description: 'Items per page (max 100)' }),
  locale: Locale.default('en').meta({ description: 'Locale for text fields' }),
  sort: z
    .string()
    .optional()
    .meta({ description: 'Sort field; prefix with - for descending', example: '-updatedAt' }),
})
export type PaginationQuery = z.infer<typeof PaginationQuery>

export const PageMeta = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
})
export type PageMeta = z.infer<typeof PageMeta>

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    meta: PageMeta,
    links: z.object({
      self: z.string(),
      next: z.string().nullable(),
      prev: z.string().nullable(),
    }),
  })

export const ApiError = z
  .object({
    error: z.object({
      code: z.string().meta({ example: 'NOT_FOUND' }),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ description: 'Error envelope' })
export type ApiError = z.infer<typeof ApiError>

export const SearchQuery = z.object({
  q: z.string().min(1).max(200).meta({ description: 'Search text', example: 'anemone' }),
  locale: Locale.default('en'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  types: z.string().optional().meta({
    description: 'Comma-separated entity types to include',
    example: 'characters,weapons',
  }),
})
export type SearchQuery = z.infer<typeof SearchQuery>

export const SearchHit = z.object({
  type: z.enum(['characters', 'weapons', 'scenarios', 'game-modes', 'maps', 'factions', 'music']),
  slug: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  href: z.string(),
  image: z.string().nullable(),
  score: z.number().optional(),
})
export type SearchHit = z.infer<typeof SearchHit>
