import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['tests/int/**/*.int.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URI: 'file:./csow.test.db',
      PAYLOAD_SECRET: 'test-secret-not-for-production',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    },
  },
})
