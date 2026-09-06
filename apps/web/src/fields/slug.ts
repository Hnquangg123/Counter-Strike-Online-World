import type { Field, FieldHook } from 'payload'

/** Lowercase kebab-case, ASCII-folded (handles Vietnamese diacritics and đ). */
export const toSlug = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatSlug =
  (fallbackField: string): FieldHook =>
  ({ value, originalDoc, data, operation }) => {
    if (typeof value === 'string' && value.length > 0) return toSlug(value)
    if (operation === 'create' || !originalDoc?.slug) {
      const fallback = data?.[fallbackField] ?? originalDoc?.[fallbackField]
      if (typeof fallback === 'string') return toSlug(fallback)
    }
    return value
  }

/**
 * A unique, indexed, URL-safe slug that auto-fills from another field.
 * Slugs are not localized: one canonical URL per entity across languages.
 */
export const slugField = (fallbackField = 'name'): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  required: true,
  admin: {
    position: 'sidebar',
    description: 'URL identifier. Auto-generated from the name; edit with care.',
  },
  hooks: {
    beforeValidate: [formatSlug(fallbackField)],
  },
})
