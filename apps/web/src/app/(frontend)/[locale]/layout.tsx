import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type * as React from 'react'
import '@/styles/globals.css'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { routing } from '@/i18n/routing'
import { getSiteSettings } from '@/lib/world'

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'site' })
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return {
    metadataBase: new URL(base),
    title: { default: t('name'), template: `%s · ${t('shortName')}` },
    description: t('tagline'),
    applicationName: t('name'),
    openGraph: { type: 'website', siteName: t('name'), locale },
    twitter: { card: 'summary_large_image' },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
      ),
    },
    icons: { icon: '/icon.svg' },
  }
}

export const viewport: Viewport = {
  themeColor: '#07080a',
  colorScheme: 'dark',
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const settings = await getSiteSettings(locale).catch(() => null)
  const t = await getTranslations('site')

  return (
    <html lang={locale} className="dark">
      <body className="min-h-dvh flex flex-col">
        <NextIntlClientProvider>
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ember focus:px-4 focus:py-2 focus:text-void"
          >
            {t('skipToContent')}
          </a>
          <SiteHeader />
          <main id="content" className="flex-1">
            {children}
          </main>
          <SiteFooter attribution={settings?.attribution} />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
