import { access, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { API_PARITY, API_SYMBOL_MAPPINGS, collectPublicExports } from './api-parity.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const reactPackagePath = resolve(repositoryRoot, 'node_modules/@lexical/react/package.json')
const packagePath = resolve(repositoryRoot, 'package.json')
const indexPath = resolve(repositoryRoot, 'src/index.ts')
const documentationPath = resolve(repositoryRoot, 'docs/API_PARITY.md')

const [reactPackage, packageJson, rootIndex] = await Promise.all([
  readJson(reactPackagePath),
  readJson(packagePath),
  readFile(indexPath, 'utf8'),
])

const errors = []
const rootSymbols = collectPublicExports(rootIndex)
const reactEntrypoints = Object.keys(reactPackage.exports)
  .filter((entrypoint) => entrypoint.startsWith('./') && !entrypoint.endsWith('.js'))
  .map((entrypoint) => entrypoint.slice(2))
  .sort()
const mappedReactEntrypoints = API_PARITY.map(([reactEntrypoint]) => reactEntrypoint).sort()

compareLists(
  '@lexical/react canonical entrypoints',
  reactEntrypoints,
  mappedReactEntrypoints,
  errors,
)
checkDuplicates(
  'React entrypoints',
  API_PARITY.map(([reactEntrypoint]) => reactEntrypoint),
  errors,
)
checkDuplicates(
  'Vue entrypoints',
  API_PARITY.map(([, vueEntrypoint]) => vueEntrypoint),
  errors,
)

if (packageJson.exports?.['./*'] === undefined) {
  errors.push('package.json must expose Vue subpath entrypoints through "./*"')
}

await Promise.all(
  API_PARITY.map(async ([reactEntrypoint, vueEntrypoint]) => {
    let vueSource
    try {
      const vuePath = resolve(repositoryRoot, `src/${vueEntrypoint}.ts`)
      await access(vuePath)
      vueSource = await readFile(vuePath, 'utf8')
    } catch {
      errors.push(`${reactEntrypoint}: missing src/${vueEntrypoint}.ts`)
    }

    if (!rootIndex.includes(`from './${vueEntrypoint}'`)) {
      errors.push(`${reactEntrypoint}: ${vueEntrypoint} is not exported from src/index.ts`)
    }

    if (vueSource !== undefined) {
      const reactDeclaration = await readFile(
        resolve(repositoryRoot, `node_modules/@lexical/react/dist/${reactEntrypoint}.d.ts`),
        'utf8',
      )
      const reactSymbols = collectPublicExports(reactDeclaration)
      const vueSymbols = collectPublicExports(vueSource)
      for (const reactSymbol of reactSymbols) {
        const vueSymbol = API_SYMBOL_MAPPINGS[`${reactEntrypoint}:${reactSymbol}`] ?? reactSymbol
        if (!vueSymbols.includes(vueSymbol)) {
          errors.push(
            `${reactEntrypoint}: public symbol ${reactSymbol} has no ${vueEntrypoint}:${vueSymbol} equivalent`,
          )
        }
        if (!rootSymbols.includes(vueSymbol)) {
          errors.push(`${reactEntrypoint}: ${vueSymbol} is not exported from src/index.ts`)
        }
      }
    }
  }),
)

const lexicalVersion = packageJson.devDependencies?.lexical
const reactVersion = packageJson.devDependencies?.['@lexical/react']
if (lexicalVersion !== reactVersion) {
  errors.push(
    `lexical (${lexicalVersion ?? 'missing'}) and @lexical/react (${reactVersion ?? 'missing'}) must use the same declared range`,
  )
}

const documentation = renderDocumentation(reactPackage.version)
if (process.argv.includes('--skip-documentation')) {
  // Compatibility runs install an undeclared upstream version without changing
  // the checked-in documentation for the currently supported Lexical line.
} else if (process.argv.includes('--write')) {
  await writeFile(documentationPath, documentation)
} else {
  let currentDocumentation = ''
  try {
    currentDocumentation = await readFile(documentationPath, 'utf8')
  } catch {
    errors.push('docs/API_PARITY.md is missing; run npm run generate:api-parity')
  }
  if (currentDocumentation !== '' && currentDocumentation !== documentation) {
    errors.push('docs/API_PARITY.md is stale; run npm run generate:api-parity')
  }
}

if (errors.length > 0) {
  throw new Error(`API parity check failed:\n- ${errors.join('\n- ')}`)
}

process.stdout.write(
  `API parity check passed: ${API_PARITY.length}/${reactEntrypoints.length} @lexical/react ${reactPackage.version} entrypoints mapped.\n`,
)

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function checkDuplicates(label, values, target) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index)
  if (duplicates.length > 0) {
    target.push(`${label} contain duplicates: ${[...new Set(duplicates)].join(', ')}`)
  }
}

function compareLists(label, actual, expected, target) {
  const missing = actual.filter((entrypoint) => !expected.includes(entrypoint))
  const removed = expected.filter((entrypoint) => !actual.includes(entrypoint))
  if (missing.length > 0) {
    target.push(`${label} missing from the matrix: ${missing.join(', ')}`)
  }
  if (removed.length > 0) {
    target.push(`${label} no longer published upstream: ${removed.join(', ')}`)
  }
}

function renderDocumentation(version) {
  const sameSubpathCount = API_PARITY.filter(([react, vue]) => react === vue).length
  const renamedCount = API_PARITY.length - sameSubpathCount
  const headings = [`@lexical/react ${version}`, 'Vue equivalent', 'Mapping']
  const rows = API_PARITY.map(([reactEntrypoint, vueEntrypoint]) => {
    const mapping = reactEntrypoint === vueEntrypoint ? 'Same subpath' : 'Vue rename'
    return [
      `\`@lexical/react/${reactEntrypoint}\``,
      `\`@gridigor/vue-lexical/${vueEntrypoint}\``,
      mapping,
    ]
  })
  const columnWidths = headings.map((heading, column) =>
    Math.max(heading.length, ...rows.map((row) => row[column].length)),
  )
  const table = [
    renderTableRow(headings, columnWidths),
    renderTableRow(
      columnWidths.map((width) => '-'.repeat(width)),
      columnWidths,
    ),
    ...rows.map((row) => renderTableRow(row, columnWidths)),
  ].join('\n')

  return `# @lexical/react API parity matrix

This matrix covers every canonical public entrypoint published by
\`@lexical/react@${version}\`. Each entrypoint has a supported Vue equivalent;
component props, React hooks, JSX render callbacks, and portals are adapted to
Vue props, composables, slots, and Teleport.

The audit is executable: \`npm run check:api-parity\` compares this matrix with
the installed upstream package, verifies every Vue source module, public symbol,
and root export, and fails when an upstream entrypoint or symbol is added or
removed. Run
\`npm run generate:api-parity\` after intentionally updating the matrix.

- ${API_PARITY.length} of ${API_PARITY.length} upstream entrypoints mapped
- ${sameSubpathCount} entrypoints keep the same subpath
- ${renamedCount} framework-named entrypoints use a \`Vue*\` name
- Detailed contract differences: [Vue API differences](./VUE_API_DIFFERENCES.md)

${table}
`
}

function renderTableRow(cells, columnWidths) {
  return `| ${cells.map((cell, index) => cell.padEnd(columnWidths[index])).join(' | ')} |`
}
