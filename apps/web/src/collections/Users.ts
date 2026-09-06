import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'System',
  },
  auth: true,
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'editor',
      required: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
}
