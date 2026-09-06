import type { GlobalConfig } from 'payload'
import { anyone, editorsOnly } from '@/access'

export const Homepage: GlobalConfig = {
  slug: 'homepage',
  admin: { group: 'System' },
  access: { read: anyone, update: editorsOnly },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        {
          name: 'headline',
          type: 'text',
          localized: true,
          defaultValue: 'Enter the world that never ended',
        },
        {
          name: 'subheadline',
          type: 'textarea',
          localized: true,
          defaultValue:
            'Every character, every weapon, every scenario and every song of Counter-Strike Online — preserved, connected, and open to everyone.',
        },
        { name: 'background', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'featuredCharacters',
      type: 'relationship',
      relationTo: 'characters',
      hasMany: true,
      maxRows: 6,
    },
    {
      name: 'featuredWeapons',
      type: 'relationship',
      relationTo: 'weapons',
      hasMany: true,
      maxRows: 8,
    },
    {
      name: 'featuredScenarios',
      type: 'relationship',
      relationTo: 'scenarios',
      hasMany: true,
      maxRows: 4,
    },
  ],
}
