import { CharacterKind } from '@csow/schema'
import type { CollectionConfig } from 'payload'
import { editorsOnly, publishedOrEditor } from '@/access'
import {
  accentColorField,
  enumOptions,
  featuredField,
  galleryField,
  gradeField,
  heroImageField,
  identityFields,
  namedDescriptionArray,
  releaseField,
  remoteMediaField,
  sideField,
  tagsField,
  triviaField,
  wikiSourceField,
} from '@/fields/shared'
import { slugField } from '@/fields/slug'

export const Characters: CollectionConfig = {
  slug: 'characters',
  labels: { singular: 'Character', plural: 'Characters' },
  admin: {
    useAsTitle: 'name',
    group: 'World',
    defaultColumns: ['name', 'kind', 'side', 'grade', 'featured', '_status', 'updatedAt'],
    description: 'Every soul of the CSO world — humans, zombies, bosses and the people in between.',
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/${locale?.code ?? 'en'}/characters/${data?.slug ?? ''}`,
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
                  name: 'kind',
                  type: 'select',
                  required: true,
                  defaultValue: 'human',
                  options: enumOptions(CharacterKind.options, { npc: 'NPC' }),
                  admin: { width: '50%' },
                },
                {
                  name: 'classType',
                  type: 'text',
                  admin: {
                    width: '50%',
                    placeholder: 'e.g. Transcendent class, Zombie hero, Boss',
                  },
                },
              ],
            },
            { name: 'factions', type: 'relationship', relationTo: 'factions', hasMany: true },
            {
              name: 'profile',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'gender', type: 'text', admin: { width: '25%' } },
                    { name: 'age', type: 'text', admin: { width: '25%' } },
                    { name: 'height', type: 'text', admin: { width: '25%' } },
                    { name: 'weight', type: 'text', admin: { width: '25%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'birthplace', type: 'text', admin: { width: '33%' } },
                    { name: 'nationality', type: 'text', admin: { width: '33%' } },
                    { name: 'birthday', type: 'text', admin: { width: '33%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'occupation', type: 'text', localized: true, admin: { width: '66%' } },
                    { name: 'bloodType', type: 'text', admin: { width: '33%' } },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Story',
          fields: [
            {
              name: 'story',
              type: 'richText',
              localized: true,
              admin: { description: 'The full story — background, motivations, fate.' },
            },
            {
              name: 'quotes',
              type: 'array',
              fields: [
                { name: 'text', type: 'textarea', required: true, localized: true },
                { name: 'context', type: 'text', localized: true },
              ],
            },
            namedDescriptionArray('abilities', 'Abilities & skills'),
            {
              name: 'scenarioStats',
              type: 'group',
              label: 'Zombie Scenario stats (x/28)',
              fields: [
                {
                  type: 'row',
                  fields: ['health', 'attack', 'mobility', 'armor', 'ammo'].map((name) => ({
                    name,
                    type: 'number' as const,
                    min: 0,
                    max: 28,
                    admin: { width: '20%', step: 1 },
                  })),
                },
              ],
            },
            {
              name: 'costumes',
              type: 'array',
              fields: [
                { name: 'name', type: 'text', required: true, localized: true },
                { name: 'description', type: 'textarea', localized: true },
                { name: 'imageUrl', type: 'text' },
              ],
            },
            triviaField,
          ],
        },
        {
          label: 'Connections',
          fields: [
            {
              name: 'signatureWeapon',
              type: 'relationship',
              relationTo: 'weapons',
              admin: { description: 'Pairing / signature weapon, if the character has one.' },
            },
            { name: 'weapons', type: 'relationship', relationTo: 'weapons', hasMany: true },
            { name: 'scenarios', type: 'relationship', relationTo: 'scenarios', hasMany: true },
            { name: 'gameModes', type: 'relationship', relationTo: 'game-modes', hasMany: true },
            { name: 'maps', type: 'relationship', relationTo: 'maps', hasMany: true },
            {
              name: 'relatedCharacters',
              type: 'relationship',
              relationTo: 'characters',
              hasMany: true,
            },
            {
              name: 'voiceActors',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'region', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
                  ],
                },
              ],
            },
            releaseField,
          ],
        },
        {
          label: 'Media',
          fields: [
            galleryField,
            remoteMediaField,
            {
              name: 'model3d',
              type: 'upload',
              relationTo: 'media',
              label: '3D figure (glTF/GLB)',
              admin: { description: 'Shown in the interactive viewer on the character page.' },
            },
          ],
        },
      ],
    },
    slugField('name'),
    sideField,
    gradeField,
    heroImageField,
    accentColorField,
    featuredField,
    tagsField,
    wikiSourceField,
  ],
}
