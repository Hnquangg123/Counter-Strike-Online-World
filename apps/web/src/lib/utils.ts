import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** Resolve a Payload relationship value to its populated document, if any. */
export const populated = <T extends { id: number | string }>(
  value: T | number | string | null | undefined,
): T | null => (value && typeof value === 'object' ? value : null)

export const populatedMany = <T extends { id: number | string }>(
  values: (T | number | string)[] | null | undefined,
): T[] => (values ?? []).filter((v): v is T => Boolean(v) && typeof v === 'object')

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0')

/** "2021-07-01" → "Jul 2021"; "2021" stays. */
export const formatPartialDate = (value: string | null | undefined, locale = 'en'): string => {
  if (!value) return ''
  const [y, m, d] = value.split('-').map(Number)
  if (!y) return value
  if (!m) return String(y)
  const date = new Date(Date.UTC(y, m - 1, d || 1))
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    ...(d ? { day: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date)
}

export const truncate = (text: string | null | undefined, max = 160): string => {
  if (!text) return ''
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`
}
