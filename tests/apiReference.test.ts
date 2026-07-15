import { describe, expect, it } from 'vitest'
import {
  describeModuleExports,
  parseRootExports,
  renderApiReference,
} from '../scripts/api-reference.mjs'

describe('API reference generation', () => {
  it('parses named root exports and preserves aliases and type-only exports', () => {
    expect(
      parseRootExports(`
        export { Editor, originalName as alias, type EditorProps } from './Editor'
        export type { Config } from './config'
      `),
    ).toEqual([
      {
        subpath: 'Editor',
        exports: [
          { name: 'Editor', sourceName: 'Editor', typeOnly: false },
          { name: 'alias', sourceName: 'originalName', typeOnly: false },
          { name: 'EditorProps', sourceName: 'EditorProps', typeOnly: true },
        ],
      },
      {
        subpath: 'config',
        exports: [{ name: 'Config', sourceName: 'Config', typeOnly: true }],
      },
    ])
  })

  it('describes Vue components, composables, classes, constants, aliases, and types', () => {
    const requestedExports = parseRootExports(
      `export { Editor, useEditor, Store, VALUE, PublicEditor, type Props } from './Editor'`,
    )[0].exports
    const descriptions = describeModuleExports(
      `
        const Editor = defineComponent({})
        /** Reads the current editor. */
        export function useEditor() {}
        export class Store {}
        export const VALUE = 1
        export type Props = { label: string }
        export { Editor as PublicEditor }
      `,
      requestedExports,
    )

    expect(descriptions).toEqual([
      { name: 'Editor', kind: 'Vue component', description: 'Vue component.' },
      { name: 'useEditor', kind: 'Composable', description: 'Reads the current editor.' },
      { name: 'Store', kind: 'Class', description: 'Public class.' },
      { name: 'VALUE', kind: 'Constant', description: 'Public constant.' },
      { name: 'PublicEditor', kind: 'Vue component', description: 'Vue component.' },
      { name: 'Props', kind: 'Type', description: 'TypeScript type.' },
    ])
  })

  it('renders package metadata, subpath imports, escaped cells, and export totals', () => {
    const documentation = renderApiReference('@scope/package', '1.2.3', [
      {
        subpath: 'Editor',
        exports: [{ name: 'Editor', kind: 'Vue component', description: 'A | B\nC' }],
      },
    ])

    expect(documentation).toContain('@scope/package@1.2.3')
    expect(documentation).toContain('All 1 named exports')
    expect(documentation).toContain('`@scope/package/Editor`')
    expect(documentation).toContain('A \\| B C')
  })

  it('rejects wildcard exports because they cannot produce a stable reference', () => {
    expect(() => parseRootExports(`export * from './Editor'`)).toThrow(
      'Unsupported wildcard export from ./Editor',
    )
  })
})
