import { fileURLToPath } from 'node:url'

const lexicalAlias = fileURLToPath(new URL('../../node_modules/lexical', import.meta.url))
const lexicalPackagesAlias = fileURLToPath(new URL('../../node_modules/@lexical', import.meta.url))

export default defineNuxtConfig({
  app: {
    head: {
      link: [{ href: 'favicon.svg', rel: 'icon', type: 'image/svg+xml' }],
    },
  },
  compatibilityDate: '2026-07-12',
  css: ['~/assets/main.css'],
  devtools: { enabled: false },
  nitro: {
    alias: {
      '@lexical': lexicalPackagesAlias,
      lexical: lexicalAlias,
    },
    externals: {
      inline: ['lexical', /^@lexical\//],
    },
  },
  vite: {
    resolve: {
      alias: {
        '@lexical': lexicalPackagesAlias,
        lexical: lexicalAlias,
      },
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
