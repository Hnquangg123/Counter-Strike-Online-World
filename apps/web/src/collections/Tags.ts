import type { CollectionConfig } from 'payload'
import { anyone, editorsOnly } from '@/access'
import { slugField } from '@/fields/slug'

export const Tags: CollectionConfig = {
  slug: 'tags',
  admin: {
    useAsTitle: 'name',
    group: 'Library',
    defaultColumns: ['name', 'slug'],
  },
  access: { read: anyone, create: editorsOnly, update: editorsOnly, delete: editorsOnly },
  fields: [{ name: 'name', type: 'text', required: true, localized: true }, slugField('name')],
}
