import type { Access } from 'payload'

/** Anyone may read published content; editors also see drafts. */
export const publishedOrEditor: Access = ({ req }) => {
  if (req.user) return true
  return { _status: { equals: 'published' } }
}

export const anyone: Access = () => true

export const editorsOnly: Access = ({ req }) => Boolean(req.user)
