import type { CollectionConfig } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
  featuredField,
  galleryField,
  heroImageField,
  releaseField,
  remoteMediaField,
  tagsField,
  triviaField,
  wikiSourceField,
} from '@/fields/shared'
import { slugField } from '@/fields/slug'

export const Music: CollectionConfig = {
  slug: 'music',
  labels: { singular: 'Track', plural: 'Music' },
  admin: {
    useAsTitle: 'title',
    group: 'World',
    defaultColumns: ['title', 'composer', 'album', '_status', 'updatedAt'],
    description: 'The soundtrack of the world — lobby themes, round music, scenario scores.',
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 25 },
  access: {
    read: publishedOrEditor,
    create: editorsOnly,
    update: editorsOnly,
    delete: editorsOnly,
  },
  defaultSort: 'title',
  fields: [
    { name: 'title', type: 'text', required: true, index: true },
    {
      name: 'name',
      type: 'text',
      admin: { hidden: true },
      hooks: { beforeValidate: [({ data }) => data?.title] },
    },
    {
      type: 'row',
      fields: [
        { name: 'composer', type: 'text', admin: { width: '40%' } },
        { name: 'album', type: 'text', admin: { width: '40%' } },
        { name: 'durationSeconds', type: 'number', admin: { width: '20%', step: 1 } },
      ],
    },
    { name: 'tagline', type: 'text', localized: true },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'description', type: 'richText', localized: true },
    {
      name: 'audio',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { kind: { equals: 'audio' } },
    },
    {
      name: 'usedIn',
      type: 'group',
      fields: [
        { name: 'gameModes', type: 'relationship', relationTo: 'game-modes', hasMany: true },
        { name: 'scenarios', type: 'relationship', relationTo: 'scenarios', hasMany: true },
        { name: 'maps', type: 'relationship', relationTo: 'maps', hasMany: true },
      ],
    },
    triviaField,
    releaseField,
    galleryField,
    remoteMediaField,
    slugField('title'),
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
