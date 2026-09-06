import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const mediaHost = process.env.MEDIA_PUBLIC_URL ? new URL(process.env.MEDIA_PUBLIC_URL) : null

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The React Compiler removes most manual memoisation; safe with React 19.2.
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/api/media/file/**' }, { pathname: '/media/**' }],
    remotePatterns: [
      ...(mediaHost
        ? [
            {
              protocol: mediaHost.protocol.replace(':', '') as 'https' | 'http',
              hostname: mediaHost.hostname,
            },
          ]
        : []),
      { protocol: 'https', hostname: 'static.wikia.nocookie.net' },
    ],
  },
  // three.js ships ESM that plays best when transpiled by Next.
  transpilePackages: ['three', '@csow/schema'],
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  async headers() {
    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Accept, Accept-Language' },
          { key: 'X-CSOW-API-Version', value: 'v1' },
        ],
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
