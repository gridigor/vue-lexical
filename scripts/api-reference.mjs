const ROOT_EXPORT_PATTERN = /export\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+['"]\.\/([^'"]+)['"]/g
const MODULE_EXPORT_PATTERN = /export\s+(type\s+)?\{([\s\S]*?)\}(?:\s+from\s+['"][^'"]+['"])?/g
const DECLARATION_PATTERN =
  /(\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?(?:export\s+)?(?:declare\s+)?(?:async\s+)?(function|class|interface|type|enum|const)\s+([$A-Z_a-z][$\w]*)/g

export function parseRootExports(sourceText) {
  const modules = []

  for (const match of sourceText.matchAll(ROOT_EXPORT_PATTERN)) {
    modules.push({
      subpath: match[3],
      exports: parseExportList(match[2], match[1] !== undefined),
    })
  }

  const wildcardMatch = sourceText.match(/export\s+\*\s+from\s+['"]([^'"]+)['"]/)
  if (wildcardMatch !== null) {
    throw new Error(`Unsupported wildcard export from ${wildcardMatch[1]}`)
  }

  return modules
}

export function describeModuleExports(sourceText, requestedExports) {
  const declarations = collectDeclarations(sourceText)
  const aliases = collectAliases(sourceText)

  return requestedExports.map((requestedExport) => {
    const resolved = resolveDeclaration(requestedExport.sourceName, declarations, aliases)
    const typeOnly = requestedExport.typeOnly || resolved.typeOnly
    const kind = typeOnly ? 'Type' : (resolved.declaration?.kind ?? inferKind(requestedExport.name))

    return {
      name: requestedExport.name,
      kind,
      description: resolved.declaration?.description ?? defaultDescription(kind),
    }
  })
}

export function renderApiReference(packageName, version, modules) {
  const exportCount = modules.reduce((total, module) => total + module.exports.length, 0)
  const sections = modules.map((module) => {
    const headings = ['Export', 'Kind', 'Description']
    const rows = module.exports.map((apiExport) => [
      `\`${escapeTableCell(apiExport.name)}\``,
      escapeTableCell(apiExport.kind),
      escapeTableCell(apiExport.description),
    ])
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

    return `## \`${module.subpath}\`

Import from the package root or from \`${packageName}/${module.subpath}\`.

${table}`
  })

  return `# API reference

This file is generated from the public exports of \`${packageName}@${version}\`.
Run \`npm run generate:api-reference\` after changing the public API. CI runs
\`npm run check:api-reference\` and fails when this reference is stale.

All ${exportCount} named exports are available from the package root. Every
section also shows its tree-shakeable subpath import. Usage guides and complete
examples remain in the [README](../README.md); Vue-specific contract differences
are documented separately in [Vue API differences](./VUE_API_DIFFERENCES.md).

${sections.join('\n\n')}
`
}

function parseExportList(exportList, declarationTypeOnly) {
  return exportList
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const entryTypeOnly = entry.startsWith('type ')
      const names = entry.replace(/^type\s+/, '').split(/\s+as\s+/)

      return {
        name: names[1] ?? names[0],
        sourceName: names[0],
        typeOnly: declarationTypeOnly || entryTypeOnly,
      }
    })
}

function collectDeclarations(sourceText) {
  const declarations = new Map()

  for (const match of sourceText.matchAll(DECLARATION_PATTERN)) {
    const declarationType = match[2]
    const name = match[3]
    let kind = declarationKind(
      declarationType,
      name,
      sourceText.slice(match.index + match[0].length),
    )
    let alias

    if (declarationType === 'const') {
      const initializer = sourceText
        .slice(match.index + match[0].length)
        .match(/^\s*(?::[^=]+)?=\s*([^\s({;]+)/)
      alias = initializer?.[1]?.match(/^[$A-Z_a-z][$\w]*$/)?.[0]
      if (initializer?.[1] === 'defineComponent') {
        kind = 'Vue component'
      }
    }

    declarations.set(name, {
      alias,
      kind,
      description: cleanJsDoc(match[1]),
    })
  }

  return declarations
}

function collectAliases(sourceText) {
  const aliases = new Map()

  for (const match of sourceText.matchAll(MODULE_EXPORT_PATTERN)) {
    for (const apiExport of parseExportList(match[2], match[1] !== undefined)) {
      aliases.set(apiExport.name, {
        sourceName: apiExport.sourceName,
        typeOnly: apiExport.typeOnly,
      })
    }
  }

  return aliases
}

function resolveDeclaration(name, declarations, aliases, visited = new Set()) {
  if (visited.has(name)) {
    return { declaration: undefined, typeOnly: false }
  }
  visited.add(name)

  const exportedAlias = aliases.get(name)
  if (exportedAlias !== undefined && exportedAlias.sourceName !== name) {
    const resolved = resolveDeclaration(exportedAlias.sourceName, declarations, aliases, visited)
    return {
      declaration: resolved.declaration,
      typeOnly: exportedAlias.typeOnly || resolved.typeOnly,
    }
  }

  const declaration = declarations.get(name)
  if (declaration?.alias !== undefined && declaration.alias !== name) {
    const resolved = resolveDeclaration(declaration.alias, declarations, aliases, visited)
    return { declaration: resolved.declaration ?? declaration, typeOnly: resolved.typeOnly }
  }

  return { declaration, typeOnly: exportedAlias?.typeOnly === true }
}

function declarationKind(declarationType, name, sourceAfterDeclaration) {
  switch (declarationType) {
    case 'type':
    case 'interface':
      return 'Type'
    case 'class':
      return 'Class'
    case 'enum':
      return 'Enum'
    case 'function':
      return name.startsWith('use') ? 'Composable' : 'Function'
    case 'const':
      if (/^\s*(?::[^=]+)?=\s*defineComponent\s*\(/.test(sourceAfterDeclaration)) {
        return 'Vue component'
      }
      if (
        /^\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[$A-Z_a-z][$\w]*)\s*=>/.test(
          sourceAfterDeclaration,
        )
      ) {
        return name.startsWith('use') ? 'Composable' : 'Function'
      }
      return 'Constant'
    default:
      return 'Export'
  }
}

function cleanJsDoc(comment) {
  if (comment === undefined) {
    return undefined
  }

  return comment
    .slice(3, comment.lastIndexOf('*/'))
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\* ?/, '').trim())
    .filter((line) => line !== '' && !line.startsWith('@'))
    .join(' ')
}

function inferKind(name) {
  if (name.startsWith('use')) {
    return 'Composable'
  }
  if (name.startsWith('$') || /^[a-z]/.test(name)) {
    return 'Function'
  }
  return 'Export'
}

function defaultDescription(kind) {
  switch (kind) {
    case 'Vue component':
      return 'Vue component.'
    case 'Composable':
      return 'Vue composable.'
    case 'Function':
      return 'Public function.'
    case 'Class':
      return 'Public class.'
    case 'Enum':
      return 'Public enum.'
    case 'Constant':
      return 'Public constant.'
    case 'Type':
      return 'TypeScript type.'
    default:
      return 'Public export.'
  }
}

function escapeTableCell(value) {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}

function renderTableRow(cells, columnWidths) {
  return `| ${cells.map((cell, index) => cell.padEnd(columnWidths[index])).join(' | ')} |`
}
