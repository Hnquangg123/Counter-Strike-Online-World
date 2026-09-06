import { Grade, type Locale, WEAPON_CATEGORY_META, WeaponCategory } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Where } from 'payload'
import { Reveal } from '@/components/fx/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { WeaponCard } from '@/components/world/cards'
import { FilterGroup, Pagination } from '@/components/world/filters'
import { listEntities } from '@/lib/world'

export const revalidate = 300

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; grade?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'weapons' })
  return { title: t('title'), description: t('intro') }
}

export default async function WeaponsPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const q = await searchParams
  const t = await getTranslations()

  const category = WeaponCategory.safeParse(q.category).success ? q.category : undefined
  const grade = Grade.safeParse(q.grade).success ? q.grade : undefined
  const page = Math.max(1, Number(q.page) || 1)
  const and: Where[] = []
  if (category) and.push({ category: { equals: category } })
  if (grade) and.push({ grade: { equals: grade } })

  const { docs, meta } = await listEntities('weapons', {
    locale,
    page,
    limit: 24,
    where: and.length ? { and } : undefined,
    sort: '-featured,name',
  })
  const query = { category, grade, page: q.page }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <SectionHeader
        as="h1"
        kicker={t('weapons.kicker')}
        title={t('weapons.title')}
        description={t('weapons.intro')}
      />

      <div className="mb-8 grid gap-3 border-y border-line py-4">
        <FilterGroup
          label={t('weapons.filterCategory')}
          param="category"
          current={category}
          pathname="/weapons"
          query={query}
          allLabel={t('common.all')}
          options={WeaponCategory.options.map((v) => ({
            value: v,
            label: WEAPON_CATEGORY_META[v].label,
          }))}
        />
        <FilterGroup
          label={t('weapons.filterGrade')}
          param="grade"
          current={grade}
          pathname="/weapons"
          query={query}
          allLabel={t('common.all')}
          options={Grade.options
            .filter((g) => g !== 'unknown')
            .map((v) => ({ value: v, label: t(`grade.${v}`) }))}
        />
      </div>

      <p className="mb-6 hud-numerals text-xs text-ember">
        {t('common.results', { count: meta.totalItems })}
      </p>

      {docs.length === 0 ? (
        <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {docs.map((w, i) => (
            <Reveal key={w.id} delay={Math.min(i, 8) * 0.04}>
              <WeaponCard
                weapon={w}
                categoryLabel={WEAPON_CATEGORY_META[w.category].label}
                labels={{ pending: t('common.imagePending') }}
              />
            </Reveal>
          ))}
        </div>
      )}

      <Pagination
        page={meta.page}
        totalPages={meta.totalPages}
        pathname="/weapons"
        query={query}
        labels={{
          prev: t('common.previous'),
          next: t('common.next'),
          page: t('common.page', { page: meta.page, total: meta.totalPages }),
        }}
      />
    </div>
  )
}
