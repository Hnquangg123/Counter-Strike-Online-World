import type { GlobalConfig } from 'payload'
import { anyone, editorsOnly } from '@/access'

/**
 * The world's master narrative, told as ordered eras. Each era links to the
 * characters and scenario chapters that carry it, so the story page can weave
 * the archive together.
 */
export const Storyline: GlobalConfig = {
  slug: 'storyline',
  admin: { group: 'World' },
  access: { read: anyone, update: editorsOnly },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', localized: true, defaultValue: 'The Story of the World' },
    { name: 'intro', type: 'textarea', localized: true },
    {
      name: 'eras',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
              admin: { width: '60%' },
            },
            {
              name: 'period',
              type: 'text',
              admin: { width: '40%', placeholder: 'e.g. Season 1 · 2010' },
            },
          ],
        },
        { name: 'subtitle', type: 'text', localized: true },
        { name: 'body', type: 'richText', localized: true },
        { name: 'characters', type: 'relationship', relationTo: 'characters', hasMany: true },
        { name: 'scenarios', type: 'relationship', relationTo: 'scenarios', hasMany: true },
        { name: 'factions', type: 'relationship', relationTo: 'factions', hasMany: true },
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'imageUrl',
          type: 'text',
          admin: { description: 'Remote (wiki) image while local media is pending.' },
        },
        {
          name: 'sources',
          type: 'array',
          fields: [{ name: 'url', type: 'text', required: true }],
        },
      ],
    },
  ],
}
