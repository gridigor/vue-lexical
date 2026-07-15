import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const rootNodeModules = fileURLToPath(new URL('../../node_modules', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@gridigor/vue-lexical': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      '@lexical': fileURLToPath(new URL('../../node_modules/@lexical', import.meta.url)),
      lexical: fileURLToPath(new URL('../../node_modules/lexical', import.meta.url)),
    },
    dedupe: ['lexical', 'vue'],
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url)), rootNodeModules],
    },
  },
})
