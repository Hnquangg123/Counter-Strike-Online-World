import { handle } from 'hono/vercel'
import { app } from '@/api/v1/app'

/**
 * Public API v1 — every request under /api/v1 is handled by the Hono app.
 * Payload's own REST API keeps living under /api/* (more specific routes win).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handle(app)
export const OPTIONS = handle(app)
