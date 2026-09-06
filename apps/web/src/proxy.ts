import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// Next.js 16 "proxy" (formerly middleware): locale detection and prefixing for the public site.
export default createMiddleware(routing)

export const config = {
  // Skip the Payload admin, all API routes, Next internals and static files.
  matcher: ['/((?!api|admin|_next|_vercel|media|favicon\\.ico|.*\\..*).*)'],
}
