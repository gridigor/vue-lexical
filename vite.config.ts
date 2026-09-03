import { readdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Every public module is its own build entry so that each documented subpath
// keeps its full export surface. With a single entry, Rollup would tree-shake
// re-exports that src/index.ts happens to import from another module.
const publicEntries = Object.fromEntries(
  readdirSync(fileURLToPath(new URL('./src', import.meta.url)))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => [file.slice(0, -3), fileURLToPath(new URL(`./src/${file}`, import.meta.url))]),
)

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@lexical/devtools-core': fileURLToPath(
        new URL('./node_modules/@lexical/devtools-core/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    lib: {
      entry: publicEntries,
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^@lexical\/(?!devtools-core(?:$|\/))/, 'lexical', 'vue', 'yjs'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/browser/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 100,
        branches: 90,
        functions: 100,
        lines: 100,
      },
    },
  },
})
