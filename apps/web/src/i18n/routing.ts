import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'vi'],
  defaultLocale: 'en',
  // English lives at the root (/characters/anemone); other locales are prefixed (/vi/characters/anemone).
  localePrefix: 'as-needed',
})

export type AppLocale = (typeof routing.locales)[number]
