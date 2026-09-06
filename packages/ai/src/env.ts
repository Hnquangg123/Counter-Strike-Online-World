/**
 * Load API keys for the CLIs from the repository's env files.
 *
 * Order of precedence (first definition wins; real environment variables win over all):
 *   1. apps/web/.env         ← the canonical place for keys (same file the site uses)
 *   2. apps/web/.env.local
 *   3. <repo root>/.env
 *   4. packages/ai/.env
 *
 * A tiny parser instead of a dependency: handles `KEY=value`, quotes, `export KEY=`,
 * comments and Windows line endings. Import this module FIRST so `config.ts` sees the
 * values when it evaluates its defaults.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

export const ENV_CANDIDATES = [
  path.join(ROOT, 'apps', 'web', '.env'),
  path.join(ROOT, 'apps', 'web', '.env.local'),
  path.join(ROOT, '.env'),
  path.join(ROOT, 'packages', 'ai', '.env'),
]

export const loadedEnvFiles: string[] = []

/** Parse a dotenv-style file into key/value pairs. */
export const parseEnv = (text: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2]!.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }
    out[match[1]!] = value
  }
  return out
}

for (const file of ENV_CANDIDATES) {
  if (!fs.existsSync(file)) continue
  try {
    for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file, 'utf8')))) {
      if (process.env[key] === undefined || process.env[key] === '') process.env[key] = value
    }
    loadedEnvFiles.push(path.relative(ROOT, file))
  } catch (err) {
    console.error(`[ai] could not read ${file}: ${(err as Error).message}`)
  }
}
