import { MediaKind } from '@csow/schema'
import type { CollectionConfig } from 'payload'
import { anyone, editorsOnly } from '@/access'
import { enumOptions } from '@/fields/shared'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Library',
    defaultColumns: ['filename', 'kind', 'alt', 'credit', 'updatedAt'],
  },
  access: { read: anyone, create: editorsOnly, update: editorsOnly, delete: editorsOnly },
  upload: {
    // Weapon icons and renders are PNGs with transparency; keep alpha intact.
    formatOptions: { format: 'webp', options: { quality: 88 } },
    imageSizes: [
      { name: 'thumbnail', width: 320, height: undefined, position: 'centre' },
      { name: 'card', width: 768, height: undefined },
      { name: 'hero', width: 1920, height: undefined },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: [
      'image/*',
      'audio/*',
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream',
      'video/*',
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, localized: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'other',
      options: enumOptions(MediaKind.options, { 'model-3d': '3D model', hud: 'HUD image' }),
    },
    { name: 'caption', type: 'textarea', localized: true },
    {
      type: 'row',
      fields: [
        {
          name: 'credit',
          type: 'text',
          admin: { width: '50%', description: 'Artist, uploader or "Nexon"' },
        },
        { name: 'sourceUrl', type: 'text', admin: { width: '50%' } },
      ],
    },
    {
      name: 'license',
      type: 'select',
      defaultValue: 'fair-use',
      options: [
        { label: 'CC BY-SA 3.0 (wiki)', value: 'CC-BY-SA-3.0' },
        { label: 'Fair use (© Nexon / Valve)', value: 'fair-use' },
        { label: 'AI-generated (project original)', value: 'ai-generated' },
        { label: 'Project original', value: 'original' },
      ],
    },
    {
      name: 'aiGeneration',
      type: 'group',
      label: 'AI generation (if applicable)',
      admin: { condition: (data) => data?.license === 'ai-generated' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'provider', type: 'text' },
            { name: 'model', type: 'text' },
          ],
        },
        { name: 'prompt', type: 'textarea' },
        { name: 'negativePrompt', type: 'textarea' },
        {
          type: 'row',
          fields: [
            { name: 'seed', type: 'number' },
            { name: 'generatedAt', type: 'date' },
          ],
        },
        {
          name: 'referenceImages',
          type: 'array',
          fields: [{ name: 'url', type: 'text', required: true }],
        },
      ],
    },
  ],
}
