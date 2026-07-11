import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  alias: {
    '@gridigor/vue-lexical': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
  },
  compatibilityDate: '2026-07-12',
  css: ['~/assets/main.css'],
  devtools: { enabled: false },
  nitro: {
    externals: {
      inline: ['lexical', /^@lexical\//],
    },
  },
})
