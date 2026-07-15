import { fileURLToPath } from 'node:url'

const lexicalAlias = fileURLToPath(new URL('../../node_modules/lexical', import.meta.url))
const lexicalPackagesAlias = fileURLToPath(new URL('../../node_modules/@lexical', import.meta.url))
const yjsAlias = fileURLToPath(new URL('../../node_modules/yjs', import.meta.url))

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
      yjs: yjsAlias,
    },
    externals: {
      inline: ['lexical', 'yjs', /^@lexical\//],
    },
  },
  vite: {
    resolve: {
      alias: {
        '@lexical': lexicalPackagesAlias,
        lexical: lexicalAlias,
        yjs: yjsAlias,
      },
      dedupe: [
        'lexical',
        '@lexical/hashtag',
        '@lexical/history',
        '@lexical/markdown',
        '@lexical/plain-text',
        '@lexical/rich-text',
        '@lexical/text',
        '@lexical/yjs',
        'yjs',
      ],
    },
  },
})
