import config from '@payload-config'
import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  editorConfigFactory,
  type SanitizedServerEditorConfig,
} from '@payloadcms/richtext-lexical'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

let editorConfigPromise: Promise<SanitizedServerEditorConfig> | null = null

/** The sanitized editor config shared by every richText field (memoised). */
export const getEditorConfig = () => {
  if (!editorConfigPromise) {
    editorConfigPromise = (async () => {
      const resolved = await config
      return editorConfigFactory.default({ config: resolved })
    })()
  }
  return editorConfigPromise
}

type RichTextValue = { root: unknown } | null | undefined

export const richTextToMarkdown = async (data: RichTextValue): Promise<string | null> => {
  if (!data) return null
  const editorConfig = await getEditorConfig()
  const md = convertLexicalToMarkdown({ data: data as SerializedEditorState, editorConfig })
  return md.trim() || null
}

export const richTextToPlaintext = (data: RichTextValue): string | null => {
  if (!data) return null
  const text = convertLexicalToPlaintext({ data: data as SerializedEditorState })
  return text.trim() || null
}

export const markdownToRichText = async (markdown: string | null | undefined) => {
  if (!markdown?.trim()) return null
  const editorConfig = await getEditorConfig()
  return convertMarkdownToLexical({ editorConfig, markdown })
}
