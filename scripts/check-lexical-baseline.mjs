import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertLexicalBaseline } from './lexical-baseline.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const [packageJson, installedLexical] = await Promise.all([
  readJson(resolve(repositoryRoot, 'package.json')),
  readJson(resolve(repositoryRoot, 'node_modules/lexical/package.json')),
])
const declaredRange = packageJson.devDependencies?.lexical

if (typeof declaredRange !== 'string') {
  throw new Error('package.json must declare lexical in devDependencies')
}

const supportedLine = assertLexicalBaseline(declaredRange, installedLexical.version)
process.stdout.write(
  `Lexical baseline check passed: installed ${installedLexical.version}, supported ${supportedLine}.x.\n`,
)

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}
