import { Grade, MediaKind, REGION_LABELS, Region, Side } from '@csow/schema'
import type { Field } from 'payload'

const label = (s: string) =>
  s.replace(/(^|-)([a-z])/g, (_, sep, c) => `${sep ? ' ' : ''}${c.toUpperCase()}`).trim()

export const enumOptions = <T extends readonly string[]>(
  values: T,
  labels?: Record<string, string>,
) => values.map((value) => ({ value, label: labels?.[value] ?? label(value) }))

/** Attribution block — required by the CC BY-SA 3.0 licence of the wiki content. */
export const wikiSourceField: Field = {
  name: 'wikiSource',
  type: 'group',
  label: 'Wiki source (attribution)',
  admin: { position: 'sidebar' },
  fields: [
    { name: 'url', type: 'text', admin: { placeholder: 'https://cso.fandom.com/wiki/…' } },
    { name: 'title', type: 'text' },
    { name: 'revisionId', type: 'number', admin: { step: 1 } },
    { name: 'fetchedAt', type: 'date' },
    {
      name: 'license',
      type: 'select',
      defaultValue: 'CC-BY-SA-3.0',
      options: [{ label: 'CC BY-SA 3.0', value: 'CC-BY-SA-3.0' }],
    },
  ],
}

export const releaseField: Field = {
  name: 'release',
  type: 'array',
  label: 'Regional releases',
  admin: { description: 'When this appeared in each regional service.' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'region',
          type: 'select',
          required: true,
          options: Region.options.map((r) => ({ value: r, label: REGION_LABELS[r].name })),
          admin: { width: '40%' },
        },
        {
          name: 'date',
          type: 'text',
          admin: { width: '30%', placeholder: 'YYYY-MM-DD' },
          validate: (value: unknown) =>
            !value ||
            /^\d{4}(-\d{2}(-\d{2})?)?$/.test(String(value)) ||
            'Use YYYY, YYYY-MM or YYYY-MM-DD',
        },
        { name: 'note', type: 'text', admin: { width: '30%' } },
      ],
    },
  ],
}

export const triviaField: Field = {
  name: 'trivia',
  type: 'array',
  fields: [{ name: 'text', type: 'textarea', localized: true, required: true }],
}

export const galleryField: Field = {
  name: 'gallery',
  type: 'upload',
  relationTo: 'media',
  hasMany: true,
  admin: {
    description:
      'Renders, artwork, screenshots. The first image doubles as the hero when no hero is set.',
  },
}

export const heroImageField: Field = {
  name: 'heroImage',
  type: 'upload',
  relationTo: 'media',
  admin: { position: 'sidebar' },
}

export const accentColorField: Field = {
  name: 'accentColor',
  type: 'text',
  admin: {
    position: 'sidebar',
    description: 'Hex colour used to tint this entry’s pages (defaults to the side/grade colour).',
    placeholder: '#F58A07',
  },
  validate: (value: unknown) =>
    !value ||
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(value)) ||
    'Use a hex colour like #F58A07',
}

/**
 * Media that still lives on the wiki CDN (static.wikia.nocookie.net). The
 * ingestion pipeline downloads these into the `media` collection; until then
 * the site renders them remotely with attribution.
 */
export const remoteMediaField: Field = {
  name: 'remoteMedia',
  type: 'array',
  label: 'Remote media (wiki-hosted)',
  admin: { description: 'Images/audio hosted on the wiki CDN, pending local ingestion.' },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'url', type: 'text', required: true, admin: { width: '60%' } },
        {
          name: 'kind',
          type: 'select',
          defaultValue: 'artwork',
          options: enumOptions(MediaKind.options, { 'model-3d': '3D model', hud: 'HUD image' }),
          admin: { width: '40%' },
        },
      ],
    },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text', defaultValue: 'Counter-Strike Online Wiki / Nexon' },
  ],
}

export const featuredField: Field = {
  name: 'featured',
  type: 'checkbox',
  defaultValue: false,
  admin: { position: 'sidebar', description: 'Show on the homepage and in featured rails.' },
}

export const tagsField: Field = {
  name: 'tags',
  type: 'relationship',
  relationTo: 'tags',
  hasMany: true,
  admin: { position: 'sidebar' },
}

export const gradeField: Field = {
  name: 'grade',
  type: 'select',
  defaultValue: 'unknown',
  options: enumOptions(Grade.options, { unknown: 'Unclassified' }),
  admin: { position: 'sidebar' },
}

export const sideField: Field = {
  name: 'side',
  type: 'select',
  defaultValue: 'neutral',
  options: enumOptions(Side.options, {
    ct: 'Counter-Terrorist',
    tr: 'Terrorist',
    zombie: 'Zombie',
    neutral: 'Neutral',
  }),
  admin: { position: 'sidebar' },
}

/** The common identity fields every world entity shares. */
export const identityFields: Field[] = [
  { name: 'name', type: 'text', required: true, index: true },
  {
    name: 'localizedName',
    type: 'text',
    localized: true,
    admin: { description: 'Display name in this locale, if it differs from the canonical name.' },
  },
  {
    name: 'aliases',
    type: 'array',
    admin: { description: 'Other names, codenames or regional names.' },
    fields: [{ name: 'alias', type: 'text', required: true }],
  },
  {
    name: 'tagline',
    type: 'text',
    localized: true,
    admin: { description: 'One line that captures the essence.' },
  },
  {
    name: 'summary',
    type: 'textarea',
    localized: true,
    admin: { description: '2–3 sentences for cards and search.' },
  },
]

export const namedDescriptionArray = (name: string, labelText?: string): Field => ({
  name,
  type: 'array',
  label: labelText,
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    { name: 'description', type: 'textarea', localized: true },
  ],
})
