import { describe, expect, it } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  it('handles Windows line endings, quotes, comments and export prefixes', () => {
    const parsed = parseEnv(
      '# keys\r\nANTHROPIC_API_KEY=sk-ant-123\r\nOPENAI_API_KEY="sk-open 456"\r\nexport FAL_KEY=\'abc:def\'\r\nEMPTY=\r\nWITH_COMMENT=value # trailing note\r\n',
    )
    expect(parsed).toEqual({
      ANTHROPIC_API_KEY: 'sk-ant-123',
      OPENAI_API_KEY: 'sk-open 456',
      FAL_KEY: 'abc:def',
      EMPTY: '',
      WITH_COMMENT: 'value',
    })
  })

  it('ignores malformed lines', () => {
    expect(parseEnv('not a pair\n=novalue\n1BAD=x\nGOOD=y')).toEqual({ GOOD: 'y' })
  })
})
