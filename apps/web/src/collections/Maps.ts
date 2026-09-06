import type { CollectionConfig } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
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

export const Maps: CollectionConfig = {
  slug: 'maps',
  labels: { singular: 'Map', plural: 'Maps' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'location', '_status', 'updatedAt'],
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
    { name: 'location', type: 'text', admin: { description: 'In-universe location' } },
    { name: 'description', type: 'richText', localized: true },
    { name: 'gameModes', type: 'relationship', relationTo: 'game-modes', hasMany: true },
    { name: 'scenario', type: 'relationship', relationTo: 'scenarios' },
    { name: 'minimap', type: 'upload', relationTo: 'media' },
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
