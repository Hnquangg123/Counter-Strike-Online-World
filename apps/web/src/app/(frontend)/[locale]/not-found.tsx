import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

export default async function NotFound() {
  const t = await getTranslations('common')
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <div aria-hidden className="tac-grid absolute inset-0 opacity-60" />
      <p className="relative hud-numerals text-8xl text-ember">404</p>
      <h1 className="relative mt-4 text-3xl text-bone md:text-4xl">{t('notFoundTitle')}</h1>
      <p className="relative mt-4 max-w-md text-ash">{t('notFoundBody')}</p>
      <Button asChild className="relative mt-8">
        <Link href="/">{t('backHome')}</Link>
      </Button>
    </div>
  )
}
