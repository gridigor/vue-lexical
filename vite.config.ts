import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

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
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
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
