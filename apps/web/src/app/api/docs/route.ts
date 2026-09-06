import { redirect } from 'next/navigation'

/** Friendly alias: /api/docs → /api/v1/docs */
export function GET() {
  redirect('/api/v1/docs')
}
