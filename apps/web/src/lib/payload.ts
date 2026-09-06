import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Payload's Local API — the fastest way to read the world from server
 * components, route handlers and scripts. `getPayload` memoises the instance.
 */
export const getPayloadClient = () => getPayload({ config })
