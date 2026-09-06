import { embedMany } from 'ai'
import { DEFAULTS, type EmbeddingProvider, embeddingModel } from './config'

export type EmbeddedDoc = { id: string; text: string; embedding: number[] }

/**
 * Embed documents for semantic search ("ask the archive"). Store the vectors in
 * Postgres with pgvector in production (Neon supports it); the dev fallback is
 * a JSON file with brute-force cosine similarity — fine for a few thousand docs.
 */
export async function embedDocuments(
  docs: { id: string; text: string }[],
  options: { provider?: EmbeddingProvider; model?: string } = {},
): Promise<EmbeddedDoc[]> {
  if (!docs.length) return []
  const model = embeddingModel(options.provider ?? DEFAULTS.embeddings.provider, options.model)
  const { embeddings } = await embedMany({ model, values: docs.map((d) => d.text) })
  return docs.map((d, i) => ({ ...d, embedding: embeddings[i] ?? [] }))
}

export const cosine = (a: number[], b: number[]) => {
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    na += (a[i] ?? 0) ** 2
    nb += (b[i] ?? 0) ** 2
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
