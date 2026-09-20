import { readdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const rootNodeModules = fileURLToPath(new URL('../../node_modules', import.meta.url))

// Deduplicated rather than aliased to the repository's node_modules: since
// Lexical 0.51 the packages import each other through subpaths, and a path
// alias for the `@lexical` scope rewrites those to bare directories, bypassing
// each package's exports map. Dedupe keeps the single instance Lexical needs
// while leaving resolution to Node. Read from the installed tree rather than a
// manifest so that transitively installed packages are covered too.
const lexicalPackages = [
  'lexical',
  ...readdirSync(new URL('../../node_modules/@lexical', import.meta.url)).map(
    (name) => `@lexical/${name}`,
  ),
]

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@gridigor/vue-lexical': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
    },
    dedupe: [...lexicalPackages, 'vue'],
  },
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url)), rootNodeModules],
    },
  },
})
