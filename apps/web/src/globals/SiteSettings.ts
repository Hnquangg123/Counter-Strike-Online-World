import type { GlobalConfig } from 'payload'
import { anyone, editorsOnly } from '@/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'System' },
  access: { read: anyone, update: editorsOnly },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      defaultValue: 'Counter-Strike Online World',
      required: true,
    },
    {
      name: 'tagline',
      type: 'text',
      localized: true,
      defaultValue: 'The world never ended. Its soul is still here.',
    },
    {
      name: 'endOfService',
      type: 'group',
      label: 'End of service memorial',
      fields: [
        { name: 'date', type: 'date', defaultValue: '2026-09-30T14:59:00.000Z' },
        {
          name: 'message',
          type: 'textarea',
          localized: true,
          defaultValue:
            'Counter-Strike Nexon ends its service on September 30, 2026. This archive keeps the world alive.',
        },
      ],
    },
    {
      name: 'attribution',
      type: 'textarea',
      localized: true,
      defaultValue:
        'Unofficial fan project. Not affiliated with Nexon or Valve. Counter-Strike is a trademark of Valve Corporation. Encyclopedic content adapted from the Counter-Strike Online Wiki under CC BY-SA 3.0.',
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { width: '40%' } },
            { name: 'url', type: 'text', required: true, admin: { width: '60%' } },
          ],
        },
      ],
    },
  ],
}
