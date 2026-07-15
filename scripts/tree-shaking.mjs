import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'

export async function buildTreeShakingFixture(entry, repositoryRoot) {
  const distDirectory = resolve(repositoryRoot, 'dist')
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        {
          find: /^@gridigor\/vue-lexical$/,
          replacement: resolve(distDirectory, 'index.js'),
        },
        {
          find: /^@gridigor\/vue-lexical\/(.+)$/,
          replacement: `${distDirectory}/$1.js`,
        },
      ],
    },
    build: {
      lib: {
        entry,
        formats: ['es'],
      },
      minify: true,
      rollupOptions: {
        external: isExternalDependency,
      },
      write: false,
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const chunks = outputs.flatMap(({ output }) =>
    output.filter((item) => item.type === 'chunk' && item.code.length > 0),
  )

  if (chunks.length !== 1) {
    throw new Error(
      `${basename(entry)} produced ${chunks.length} non-empty chunks; expected exactly one`,
    )
  }

  const code = chunks[0].code
  const rawBytes = Buffer.byteLength(code)

  return {
    name: basename(entry),
    code,
    rawBytes,
    gzipBytes: gzipSync(code, { level: 9 }).byteLength,
  }
}

export function findTreeShakingFailures(rootImport, subpathImport, budgets) {
  const failures = []

  for (const fixture of [rootImport, subpathImport]) {
    if (fixture.rawBytes > budgets.rawBytes) {
      failures.push(
        `${fixture.name} raw output is ${fixture.rawBytes} bytes; limit is ${budgets.rawBytes}`,
      )
    }
    if (fixture.gzipBytes > budgets.gzipBytes) {
      failures.push(
        `${fixture.name} gzip output is ${fixture.gzipBytes} bytes; limit is ${budgets.gzipBytes}`,
      )
    }
  }

  if (rootImport.code !== subpathImport.code) {
    failures.push('root and subpath imports do not produce identical tree-shaken code')
  }

  return failures
}

export async function readFixtureSource(entry) {
  return readFile(entry, 'utf8')
}

function isExternalDependency(id) {
  return id === 'lexical' || id === 'vue' || id === 'yjs' || id.startsWith('@lexical/')
}
