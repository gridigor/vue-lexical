import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildTreeShakingFixture,
  findTreeShakingFailures,
  readFixtureSource,
} from './tree-shaking.mjs'
import { formatBytes } from './bundle-size.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const fixtureDirectory = resolve(repositoryRoot, 'tests/fixtures/tree-shaking')
const rootEntry = resolve(fixtureDirectory, 'root-import.ts')
const subpathEntry = resolve(fixtureDirectory, 'subpath-import.ts')
const budgets = {
  rawBytes: 1024,
  gzipBytes: 512,
}

const [rootImport, subpathImport, rootSource, subpathSource] = await Promise.all([
  buildTreeShakingFixture(rootEntry, repositoryRoot),
  buildTreeShakingFixture(subpathEntry, repositoryRoot),
  readFixtureSource(rootEntry),
  readFixtureSource(subpathEntry),
])

if (!rootSource.includes("from '@gridigor/vue-lexical'")) {
  throw new Error('root-import.ts must import from the package root')
}
if (!subpathSource.includes("from '@gridigor/vue-lexical/LexicalAutoFocusPlugin'")) {
  throw new Error('subpath-import.ts must import the matching package subpath')
}

for (const fixture of [rootImport, subpathImport]) {
  process.stdout.write(
    `${fixture.name}: ${formatBytes(fixture.rawBytes)} raw, ${formatBytes(fixture.gzipBytes)} gzip\n`,
  )
}

const failures = findTreeShakingFailures(rootImport, subpathImport, budgets)
if (failures.length > 0) {
  throw new Error(`Tree-shaking check failed:\n- ${failures.join('\n- ')}`)
}

process.stdout.write(
  `Tree-shaking check passed: root and subpath imports produce the same isolated module.\n`,
)
