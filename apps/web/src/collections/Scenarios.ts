import { Difficulty } from '@csow/schema'
import type { CollectionConfig } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
  enumOptions,
  featuredField,
  galleryField,
  heroImageField,
  identityFields,
  releaseField,
  remoteMediaField,
  tagsField,
  triviaField,
  wikiSourceField,
} from '@/fields/shared'
import { slugField } from '@/fields/slug'

export const Scenarios: CollectionConfig = {
  slug: 'scenarios',
  labels: { singular: 'Scenario', plural: 'Scenarios' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'gameMode', 'season', 'chapter', '_status', 'updatedAt'],
    description: 'Story chapters — Zombie Scenario seasons and every other narrative campaign.',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale?.code ?? 'en'}/scenarios/${data?.slug ?? ''}`,
    },
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 25 },
  access: {
    read: publishedOrEditor,
    create: editorsOnly,
    update: editorsOnly,
    delete: editorsOnly,
  },
  defaultSort: 'chapter',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Chapter',
          fields: [
            ...identityFields,
            {
              type: 'row',
              fields: [
                {
                  name: 'gameMode',
                  type: 'relationship',
                  relationTo: 'game-modes',
                  required: true,
                  admin: { width: '50%' },
                },
                { name: 'season', type: 'text', admin: { width: '25%', placeholder: 'Season 2' } },
                { name: 'chapter', type: 'number', admin: { width: '25%', step: 1 } },
              ],
            },
            {
              name: 'difficulties',
              type: 'select',
              hasMany: true,
              options: enumOptions(Difficulty.options),
            },
          ],
        },
        {
          label: 'Story',
          fields: [
            { name: 'story', type: 'richText', localized: true },
            {
              name: 'objectives',
              type: 'array',
              fields: [{ name: 'text', type: 'text', required: true, localized: true }],
            },
            {
              name: 'rewards',
              type: 'array',
              fields: [{ name: 'text', type: 'text', required: true, localized: true }],
            },
            triviaField,
          ],
        },
        {
          label: 'Connections',
          fields: [
            {
              name: 'bosses',
              type: 'relationship',
              relationTo: 'characters',
              hasMany: true,
              filterOptions: { kind: { in: ['boss', 'zombie', 'npc'] } },
            },
            { name: 'characters', type: 'relationship', relationTo: 'characters', hasMany: true },
            { name: 'maps', type: 'relationship', relationTo: 'maps', hasMany: true },
            { name: 'nextChapter', type: 'relationship', relationTo: 'scenarios' },
            releaseField,
          ],
        },
        { label: 'Media', fields: [galleryField, remoteMediaField] },
      ],
    },
    slugField('name'),
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
