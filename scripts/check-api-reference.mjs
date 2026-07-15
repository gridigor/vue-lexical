import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeModuleExports, parseRootExports, renderApiReference } from './api-reference.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const indexPath = resolve(repositoryRoot, 'src/index.ts')
const documentationPath = resolve(repositoryRoot, 'docs/API_REFERENCE.md')
const packagePath = resolve(repositoryRoot, 'package.json')

const [indexSource, packageJson] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(packagePath, 'utf8').then(JSON.parse),
])
const rootModules = parseRootExports(indexSource, indexPath)
const modules = await Promise.all(
  rootModules.map(async (module) => {
    const modulePath = resolve(repositoryRoot, `src/${module.subpath}.ts`)
    const sourceText = await readFile(modulePath, 'utf8')

    return {
      subpath: module.subpath,
      exports: describeModuleExports(sourceText, module.exports, modulePath),
    }
  }),
)
const documentation = renderApiReference(packageJson.name, packageJson.version, modules)

if (process.argv.includes('--write')) {
  await writeFile(documentationPath, documentation)
  process.stdout.write(
    `Generated API reference for ${modules.length} subpaths at docs/API_REFERENCE.md.\n`,
  )
} else {
  let currentDocumentation = ''
  try {
    currentDocumentation = await readFile(documentationPath, 'utf8')
  } catch {
    throw new Error('docs/API_REFERENCE.md is missing; run npm run generate:api-reference')
  }

  if (currentDocumentation !== documentation) {
    throw new Error('docs/API_REFERENCE.md is stale; run npm run generate:api-reference')
  }

  process.stdout.write(`API reference check passed for ${modules.length} public subpaths.\n`)
}
