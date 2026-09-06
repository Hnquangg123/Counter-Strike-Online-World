import wtf from 'wtf_wikipedia'

export type ParsedSection = { title: string; depth: number; text: string }

export type ParsedPage = {
  title: string
  /** Normalised infobox key/values (lowercase keys, plain-text values). */
  infobox: Record<string, string>
  infoboxTemplate: string | null
  /** Every infobox, in case a page has several (variants, forms). */
  infoboxes: Record<string, string>[]
  intro: string
  sections: ParsedSection[]
  /** Markdown-ish rendering of the whole article body. */
  markdown: string
  categories: string[]
  /** File names referenced anywhere on the page. */
  images: { file: string; caption: string }[]
  templates: string[]
}

const normaliseKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

const cleanText = (text: string) =>
  text
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

/** Sections we never want as prose (navigation, boilerplate). */
const SKIP_SECTIONS = new Set([
  'references',
  'external links',
  'see also',
  'navigation',
  'gallery',
  'videos',
  'video',
  'notes',
])

/**
 * Parse raw wikitext into a shape the mappers can work with. wtf_wikipedia does
 * the heavy lifting (templates, links, tables); we flatten it to plain text and
 * a light Markdown structure that later becomes Lexical rich text.
 */
export function parseWikitext(title: string, wikitext: string): ParsedPage {
  const doc = wtf(wikitext)
  const infoboxes = doc.infoboxes().map((box) => {
    const kv = box.keyValue() as Record<string, string>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(kv))
      if (v?.trim()) out[normaliseKey(k)] = cleanText(String(v))
    out.__template = box.type()
    return out
  })
  const first = infoboxes[0]

  const sections: ParsedSection[] = []
  const mdParts: string[] = []
  let intro = ''
  for (const sec of doc.sections()) {
    const secTitle = sec.title().trim()
    const text = cleanText(sec.text({}))
    if (!secTitle) {
      intro = text
      if (text) mdParts.push(text)
      continue
    }
    if (SKIP_SECTIONS.has(secTitle.toLowerCase())) continue
    sections.push({ title: secTitle, depth: sec.depth(), text })
    if (text) mdParts.push(`${'#'.repeat(Math.min(6, sec.depth() + 2))} ${secTitle}\n\n${text}`)
  }

  const images = doc
    .images()
    .map((img) => ({ file: img.file(), caption: cleanText(img.caption() || img.alt() || '') }))

  return {
    title,
    infobox: first
      ? Object.fromEntries(Object.entries(first).filter(([k]) => k !== '__template'))
      : {},
    infoboxTemplate: first?.__template ?? null,
    infoboxes: infoboxes.map((b) =>
      Object.fromEntries(Object.entries(b).filter(([k]) => k !== '__template')),
    ),
    intro,
    sections,
    markdown: mdParts.join('\n\n'),
    categories: doc.categories(),
    images,
    templates: (doc.templates() as unknown as { json?: () => { template?: string } }[])
      .map((t) => {
        try {
          return String(t.json?.()?.template ?? '')
        } catch {
          return ''
        }
      })
      .filter(Boolean),
  }
}
