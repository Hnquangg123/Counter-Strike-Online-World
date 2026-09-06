import type { Region } from '@csow/schema'

export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const en = (text: string | null | undefined) =>
  text?.trim() ? { en: text.trim() } : undefined

/** First value present among several candidate infobox keys. */
export const pick = (box: Record<string, string>, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const v = box[key.toLowerCase().replace(/[\s_-]+/g, '')]
    if (v?.trim()) return v.trim()
  }
  return undefined
}

/** "83%" → 83, "28 (Normal) / 40 (Zombie)" → 28, "High" → undefined. */
export const statNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const m = value.match(/^\s*(\d+(?:\.\d+)?)\s*%?/)
  if (!m) return undefined
  const n = Number(m[1])
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined
}

export const integer = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const m = value.replace(/,/g, '').match(/\d+/)
  return m ? Number(m[0]) : undefined
}

const MONTHS: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
}

/** Accepts "July 1, 2021", "1 July 2021", "2021-07-01", "2021.07.01", "July 2021", "2021". */
export const isoDate = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const v = value.trim()
  let m = v.match(/(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?/)
  if (m) return `${m[1]}-${m[2]!.padStart(2, '0')}${m[3] ? `-${m[3].padStart(2, '0')}` : ''}`
  m = v.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)
  if (m && MONTHS[m[1]!.toLowerCase()])
    return `${m[3]}-${MONTHS[m[1]!.toLowerCase()]}-${m[2]!.padStart(2, '0')}`
  m = v.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})/)
  if (m && MONTHS[m[2]!.toLowerCase()])
    return `${m[3]}-${MONTHS[m[2]!.toLowerCase()]}-${m[1]!.padStart(2, '0')}`
  m = v.match(/([A-Za-z]+)\.?,?\s+(\d{4})/)
  if (m && MONTHS[m[1]!.toLowerCase()]) return `${m[2]}-${MONTHS[m[1]!.toLowerCase()]}`
  m = v.match(/\b(19|20)\d{2}\b/)
  return m ? m[0] : undefined
}

const REGION_HINTS: [RegExp, Region][] = [
  [/south korea|korea|kr\b|nexon korea/i, 'kr'],
  [/china|cn\b|tiancity/i, 'cn'],
  [/taiwan|hong kong|tw\/hk|tw\b|beanfun|gamania/i, 'tw'],
  [/japan|jp\b/i, 'jp'],
  [/indonesia|id\b|megaxus/i, 'id'],
  [/vietnam|vn\b|vtc/i, 'vn'],
  [/singapore|malaysia|sg\/my|sea\b|asiasoft/i, 'sg'],
  [/thailand|th\b/i, 'th'],
  [/turkey|türkiye|tr\b|joygame/i, 'tr'],
  [/russia|cis|ru\b|101xp/i, 'ru'],
  [/csn|cso nexon|counter-strike nexon|steam|global|csnz|csns|cso:z/i, 'csn'],
]

export const regionOf = (label: string): Region | undefined =>
  REGION_HINTS.find(([re]) => re.test(label))?.[1]

/**
 * Parse a wiki release block such as
 *   "South Korea: 1 July 2021, Taiwan/Hong Kong: 14 July 2021"
 * or one region per line, into RegionalRelease entries.
 */
export const parseReleases = (
  value: string | undefined,
): { region: Region; date?: string; note?: string }[] => {
  if (!value) return []
  const out: { region: Region; date?: string; note?: string }[] = []
  for (const line of value.split(/\n|,(?=\s*[A-Z][a-z]+(?:\/[A-Z][a-z]+)?\s*:)|;/)) {
    const [label, ...rest] = line.split(':')
    if (!label) continue
    const region = regionOf(label)
    if (!region) continue
    const date = isoDate(rest.join(':')) ?? isoDate(label)
    out.push({ region, ...(date ? { date } : {}) })
  }
  return out
}

/** Split a comma/newline/bullet separated infobox value into items. */
export const listOf = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/\n|•|,(?![^()]*\))/)
    .map((s) => s.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
