import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/ and https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    // The commit the build came from: GitHub Actions sets GITHUB_SHA, local builds say `dev`.
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev'),
  },
  test: {
    projects: [
      {
        // Fast tests without Firebase. Run with `npm run test`.
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          // Script tests declare `// @vitest-environment node` themselves.
          include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
          exclude: ['**/*.emulator.test.{ts,tsx}', '**/node_modules/**'],
          setupFiles: ['./src/test/setup.ts'],
          // Vitest skips CSS by default; the theme test reads the design tokens as raw text.
          css: { include: [/src\/styles\/theme\.css/] },
        },
      },
      {
        // Tests against the local Firebase emulators. Run with `npm run test:emulator`.
        extends: true,
        test: {
          name: 'emulator',
          environment: 'node',
          include: ['**/*.emulator.test.{ts,tsx}'],
          exclude: ['**/node_modules/**'],
          setupFiles: ['./src/test/setup.ts'],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
