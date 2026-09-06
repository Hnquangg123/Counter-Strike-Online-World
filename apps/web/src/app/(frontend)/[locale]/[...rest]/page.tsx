import { notFound } from 'next/navigation'

/** Any unmatched route inside a locale renders the localized 404. */
export default function CatchAll() {
  notFound()
}
