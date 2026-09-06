import { WEAPON_CATEGORY_META, WeaponCategory } from '@csow/schema'
import type { CollectionConfig, Field } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
  featuredField,
  galleryField,
  gradeField,
  heroImageField,
  identityFields,
  namedDescriptionArray,
  releaseField,
  remoteMediaField,
  tagsField,
  triviaField,
  wikiSourceField,
} from '@/fields/shared'
import { slugField } from '@/fields/slug'

const stat = (name: string, description?: string): Field => ({
  name,
  type: 'number',
  min: 0,
  max: 100,
  admin: { width: '25%', step: 1, description },
})

export const Weapons: CollectionConfig = {
  slug: 'weapons',
  labels: { singular: 'Weapon', plural: 'Weapons' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'category', 'grade', 'featured', '_status', 'updatedAt'],
    description: 'The armory — from the AK-47 to the Transcendent arsenal.',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale?.code ?? 'en'}/weapons/${data?.slug ?? ''}`,
    },
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
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identity',
          fields: [
            ...identityFields,
            {
              type: 'row',
              fields: [
                {
                  name: 'category',
                  type: 'select',
                  required: true,
                  options: WeaponCategory.options.map((value) => ({
                    value,
                    label: WEAPON_CATEGORY_META[value].label,
                  })),
                  admin: { width: '34%' },
                },
                {
                  name: 'origin',
                  type: 'text',
                  admin: { width: '33%', placeholder: 'Country of origin' },
                },
                { name: 'manufacturer', type: 'text', admin: { width: '33%' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'caliber', type: 'text', admin: { width: '34%' } },
                {
                  name: 'price',
                  type: 'number',
                  admin: { width: '33%', step: 1, description: 'In-game $' },
                },
                {
                  name: 'fireModes',
                  type: 'text',
                  hasMany: true,
                  admin: {
                    width: '33%',
                    description: 'e.g. Automatic, Semi-automatic, Shuriken Storm (right-click)',
                  },
                },
              ],
            },
            { name: 'description', type: 'richText', localized: true },
            { name: 'obtainMethod', type: 'textarea', localized: true, label: 'How to obtain' },
          ],
        },
        {
          label: 'Stats',
          fields: [
            {
              name: 'stats',
              type: 'group',
              admin: {
                description: 'In-game bars, 0–100. Knockback and stun matter in zombie modes.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [stat('damage'), stat('accuracy'), stat('recoil'), stat('rateOfFire')],
                },
                {
                  type: 'row',
                  fields: [stat('weight', 'Higher = slower'), stat('knockback'), stat('stun')],
                },
              ],
            },
            {
              name: 'statNotes',
              type: 'json',
              admin: {
                description:
                  'Descriptive notes per stat when the wiki gives prose instead of a bar value, e.g. {"damage": "28 (Normal) / 40-47 (Zombie)"}.',
              },
            },
            {
              name: 'ammo',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'magazine', type: 'number', admin: { width: '33%', step: 1 } },
                    { name: 'reserve', type: 'number', admin: { width: '33%', step: 1 } },
                    {
                      name: 'type',
                      type: 'text',
                      admin: { width: '34%', placeholder: '7.62mm NATO' },
                    },
                  ],
                },
              ],
            },
            namedDescriptionArray('abilities', 'Special abilities'),
            triviaField,
          ],
        },
        {
          label: 'Connections',
          fields: [
            {
              name: 'variants',
              type: 'relationship',
              relationTo: 'weapons',
              hasMany: true,
              admin: { description: 'Reskins, upgrades and sibling weapons.' },
            },
            { name: 'characters', type: 'relationship', relationTo: 'characters', hasMany: true },
            releaseField,
          ],
        },
        {
          label: 'Media',
          fields: [
            {
              name: 'icon',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Side-profile HUD icon (transparent PNG).' },
            },
            galleryField,
            remoteMediaField,
            { name: 'model3d', type: 'upload', relationTo: 'media', label: '3D model (glTF/GLB)' },
          ],
        },
      ],
    },
    slugField('name'),
    gradeField,
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
