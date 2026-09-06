import type { CollectionConfig } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
  featuredField,
  galleryField,
  heroImageField,
  identityFields,
  remoteMediaField,
  sideField,
  tagsField,
  triviaField,
  wikiSourceField,
} from '@/fields/shared'
import { slugField } from '@/fields/slug'

export const Factions: CollectionConfig = {
  slug: 'factions',
  labels: { singular: 'Faction', plural: 'Factions' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'side', '_status', 'updatedAt'],
    description: 'Organisations that shaped the war — Aegis, Vanguard, Rex and the rest.',
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
    { name: 'description', type: 'richText', localized: true },
    { name: 'lore', type: 'richText', localized: true },
    { name: 'leaders', type: 'relationship', relationTo: 'characters', hasMany: true },
    { name: 'members', type: 'relationship', relationTo: 'characters', hasMany: true },
    { name: 'emblem', type: 'upload', relationTo: 'media' },
    triviaField,
    galleryField,
    remoteMediaField,
    slugField('name'),
    sideField,
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
