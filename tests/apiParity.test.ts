import { describe, expect, it } from 'vitest'
import { API_SYMBOL_MAPPINGS, collectPublicExports } from '../scripts/api-parity.mjs'

describe('API parity helpers', () => {
  it('collects declarations, aliases, and type-only re-exports once', () => {
    expect(
      collectPublicExports(`
        export interface Props {}
        export declare function Editor(): void
        export const VALUE = 1
        export type { Props as PublicProps, ExternalType } from './types'
        export { Editor as PublicEditor, VALUE }
      `),
    ).toEqual(['Editor', 'ExternalType', 'Props', 'PublicEditor', 'PublicProps', 'VALUE'])
  })

  it('declares every framework-specific symbol rename explicitly', () => {
    expect(API_SYMBOL_MAPPINGS['ReactExtension:ReactExtension']).toBe('VueExtension')
    expect(API_SYMBOL_MAPPINGS['ReactPluginHostExtension:mountReactPluginElement']).toBe(
      'mountVuePluginElement',
    )
    expect(API_SYMBOL_MAPPINGS['LexicalNodeMenuPlugin:MenuRenderFn']).toBe('MenuSlotProps')
  })
})
