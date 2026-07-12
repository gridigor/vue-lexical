export default defineNuxtConfig({
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
