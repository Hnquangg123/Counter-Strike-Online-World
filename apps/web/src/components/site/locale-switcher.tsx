'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { cn } from '@/lib/utils'

const LABELS: Record<string, string> = { en: 'EN', vi: 'VI' }

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would need heavy style resets; role="group" is the ARIA equivalent
    <div
      className={cn('flex items-center chamfer-sm ring-1 ring-inset ring-line-strong', className)}
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          onClick={() => router.replace(pathname, { locale: l })}
          className={cn(
            'px-2.5 py-1.5 font-display text-[0.65rem] font-bold tracking-[0.2em] transition-colors',
            l === locale ? 'bg-ember text-void' : 'text-ash hover:text-bone',
          )}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
