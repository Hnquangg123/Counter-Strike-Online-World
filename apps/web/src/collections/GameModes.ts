import { ModeFamily } from '@csow/schema'
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

export const GameModes: CollectionConfig = {
  slug: 'game-modes',
  labels: { singular: 'Game mode', plural: 'Game modes' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'family', 'featured', '_status', 'updatedAt'],
    description: 'Each mode tells a different story: Original, Zombie, Scenario, Fun and more.',
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 25 },
  access: {
    read: publishedOrEditor,
    create: editorsOnly,
    update: editorsOnly,
    delete: editorsOnly,
  },
  defaultSort: 'name',
  fields: [
    ...identityFields,
    {
      type: 'row',
      fields: [
        {
          name: 'family',
          type: 'select',
          required: true,
          options: enumOptions(ModeFamily.options, { pve: 'PvE' }),
          admin: { width: '50%' },
        },
        { name: 'maxPlayers', type: 'number', admin: { width: '50%', step: 1 } },
      ],
    },
    { name: 'description', type: 'richText', localized: true },
    {
      name: 'lore',
      type: 'richText',
      localized: true,
      admin: { description: 'The story this mode tells.' },
    },
    {
      name: 'rules',
      type: 'array',
      fields: [{ name: 'text', type: 'text', required: true, localized: true }],
    },
    triviaField,
    releaseField,
    galleryField,
    remoteMediaField,
    slugField('name'),
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
