import { ExternalLink } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

type Source =
  | { url?: string | null; title?: string | null; revisionId?: number | null }
  | null
  | undefined

/** Per-page CC BY-SA attribution — a licence requirement and a courtesy to the wiki's editors. */
export async function Attribution({ source }: { source: Source }) {
  if (!source?.url) return null
  const t = await getTranslations('common')
  return (
    <aside className="mt-16 flex flex-col gap-2 border-t border-line pt-6 text-xs text-dust md:flex-row md:items-center md:justify-between">
      <p>
        {t('source')}:{' '}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer license"
          className="inline-flex items-center gap-1 text-ash hover:text-flare"
        >
          {source.title ?? source.url.replace(/^https?:\/\//, '')}
          <ExternalLink className="h-3 w-3" />
        </a>
        {source.revisionId ? ` · ${t('revision')} ${source.revisionId}` : ''}
      </p>
      <p>
        <a
          href="https://creativecommons.org/licenses/by-sa/3.0/"
          target="_blank"
          rel="noopener noreferrer license"
          className="hover:text-flare"
        >
          {t('sourceNote')}
        </a>
      </p>
    </aside>
  )
}
