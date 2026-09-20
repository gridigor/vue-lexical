import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const lexicalAlias = fileURLToPath(new URL('../../node_modules/lexical', import.meta.url))
const yjsAlias = fileURLToPath(new URL('../../node_modules/yjs', import.meta.url))

// The `@lexical` scope is deduplicated rather than aliased to a directory:
// since Lexical 0.51 the packages import each other through subpaths, which a
// directory alias rewrites to bare paths, bypassing each package's exports
// map. `lexical` and `yjs` publish a single entrypoint each, so aliasing them
// to the repository copy is still safe.
const lexicalPackages = readdirSync(new URL('../../node_modules/@lexical', import.meta.url)).map(
  (name) => `@lexical/${name}`,
)

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
        lexical: lexicalAlias,
        yjs: yjsAlias,
      },
      dedupe: ['lexical', ...lexicalPackages, 'yjs'],
    },
    // Bundled by Vite rather than left for Nitro to resolve, so that the
    // dedupe above also governs the server build.
    ssr: {
      noExternal: ['lexical', ...lexicalPackages, 'yjs'],
    },
  },
})
