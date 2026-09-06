import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import { cn } from '@/lib/utils'

type Props = { data: unknown; className?: string }

/** Renders Payload's Lexical rich text with the archive's long-form typography. */
export function RichText({ data, className }: Props) {
  if (!data || typeof data !== 'object' || !('root' in data)) return null
  return (
    <PayloadRichText
      data={data as SerializedEditorState}
      className={cn('prose-cso', className)}
      disableContainer={false}
    />
  )
}
