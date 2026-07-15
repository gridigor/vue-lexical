import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const LEXICAL_PACKAGE_PATTERN = /^(?:lexical|@lexical\/[^/]+)$/
const EXACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

export function collectLexicalPackageNames(packageJson) {
  const packageNames = new Set()

  for (const dependencyGroup of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
  ]) {
    for (const packageName of Object.keys(dependencyGroup ?? {})) {
      if (LEXICAL_PACKAGE_PATTERN.test(packageName)) {
        packageNames.add(packageName)
      }
    }
  }

  return [...packageNames].sort((left, right) => left.localeCompare(right))
}

export function createLexicalInstallSpecs(packageNames, version) {
  if (!EXACT_VERSION_PATTERN.test(version)) {
    throw new Error(`Expected an exact Lexical version, received: ${version}`)
  }

  if (packageNames.length === 0) {
    throw new Error('No Lexical packages were found in package.json')
  }

  return packageNames.map((packageName) => `${packageName}@${version}`)
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
  const version = process.argv[2]
  if (version === undefined) {
    throw new Error('Usage: node scripts/lexical-compatibility.mjs <exact-version>')
  }

  const packageJson = JSON.parse(
    await import('node:fs/promises').then(({ readFile }) =>
      readFile(resolve(fileURLToPath(new URL('..', import.meta.url)), 'package.json'), 'utf8'),
    ),
  )
  process.stdout.write(
    createLexicalInstallSpecs(collectLexicalPackageNames(packageJson), version).join(' '),
  )
}
