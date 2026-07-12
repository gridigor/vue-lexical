import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  alias: {
    '@lexical': fileURLToPath(new URL('../../node_modules/@lexical', import.meta.url)),
    lexical: fileURLToPath(new URL('../../node_modules/lexical', import.meta.url)),
  },
  app: {
    head: {
      link: [{ href: 'favicon.svg', rel: 'icon', type: 'image/svg+xml' }],
    },
  },
  compatibilityDate: '2026-07-12',
  css: ['~/assets/main.css'],
  devtools: { enabled: false },
  nitro: {
    externals: {
      inline: ['lexical', /^@lexical\//],
    },
  },
  vite: {
    resolve: {
      dedupe: [
        'lexical',
        '@lexical/hashtag',
        '@lexical/history',
        '@lexical/markdown',
        '@lexical/plain-text',
        '@lexical/rich-text',
        '@lexical/text',
      ],
    },
  },
})
