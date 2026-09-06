import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { seoPlugin } from '@payloadcms/plugin-seo'
import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Characters } from './collections/Characters'
import { Factions } from './collections/Factions'
import { GameModes } from './collections/GameModes'
import { Maps } from './collections/Maps'
import { Media } from './collections/Media'
import { Music } from './collections/Music'
import { Scenarios } from './collections/Scenarios'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { Weapons } from './collections/Weapons'
import { Homepage } from './globals/Homepage'
import { SiteSettings } from './globals/SiteSettings'
import { Storyline } from './globals/Storyline'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const databaseURI = process.env.DATABASE_URI ?? 'file:./csow.db'
const isPostgres = /^postgres(ql)?:/.test(databaseURI)
const serverURL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const s3Enabled = Boolean(process.env.S3_BUCKET)

/**
 * Database: SQLite for zero-setup local development, Postgres (Neon) in
 * production. The adapter is chosen from DATABASE_URI so the same code runs
 * everywhere. Postgres uses migrations (`pnpm migrate`); SQLite pushes schema
 * changes automatically in development.
 */
const db = isPostgres
  ? postgresAdapter({
      pool: { connectionString: databaseURI },
      push: process.env.NODE_ENV !== 'production',
      migrationDir: path.resolve(dirname, 'migrations'),
    })
  : sqliteAdapter({
      client: { url: databaseURI },
      push: true,
    })

export default buildConfig({
  serverURL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' · CSOW',
      description: 'Counter-Strike Online World — content studio',
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
  },
  collections: [
    Characters,
    Weapons,
    Scenarios,
    GameModes,
    Maps,
    Factions,
    Music,
    Media,
    Tags,
    Users,
  ],
  globals: [SiteSettings, Homepage, Storyline],
  localization: {
    locales: [
      { label: 'English', code: 'en' },
      { label: 'Tiếng Việt', code: 'vi' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      FixedToolbarFeature(),
      HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
      BlocksFeature({ blocks: [] }),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  graphQL: { disable: false },
  cors: [serverURL],
  csrf: [serverURL],
  db,
  sharp,
  upload: {
    limits: { fileSize: 50 * 1024 * 1024 },
  },
  plugins: [
    seoPlugin({
      collections: [
        'characters',
        'weapons',
        'scenarios',
        'game-modes',
        'maps',
        'factions',
        'music',
      ],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => `${doc?.name ?? doc?.title ?? ''} · Counter-Strike Online World`,
      generateDescription: ({ doc }) => doc?.summary ?? doc?.tagline ?? '',
    }),
    s3Storage({
      enabled: s3Enabled,
      collections: {
        media: {
          prefix: 'media',
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) =>
            `${process.env.MEDIA_PUBLIC_URL ?? ''}/${prefix ? `${prefix}/` : ''}${filename}`,
        },
      },
      bucket: process.env.S3_BUCKET ?? '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      },
    }),
  ],
})
