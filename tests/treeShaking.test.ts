import { describe, expect, it } from 'vitest'
import { findTreeShakingFailures, type TreeShakingFixtureResult } from '../scripts/tree-shaking.mjs'

function createResult(
  name: string,
  code: string,
  rawBytes: number,
  gzipBytes: number,
): TreeShakingFixtureResult {
  return { name, code, rawBytes, gzipBytes }
}

describe('tree-shaking fixtures', () => {
  it('accepts identical root and subpath bundles within their budgets', () => {
    const root = createResult('root-import.ts', 'export{}', 100, 50)
    const subpath = createResult('subpath-import.ts', 'export{}', 100, 50)

    expect(findTreeShakingFailures(root, subpath, { rawBytes: 100, gzipBytes: 50 })).toEqual([])
  })

  it('reports raw, gzip, and output-parity regressions for both fixtures', () => {
    const root = createResult('root-import.ts', 'root', 101, 51)
    const subpath = createResult('subpath-import.ts', 'subpath', 102, 52)

    expect(findTreeShakingFailures(root, subpath, { rawBytes: 100, gzipBytes: 50 })).toEqual([
      'root-import.ts raw output is 101 bytes; limit is 100',
      'root-import.ts gzip output is 51 bytes; limit is 50',
      'subpath-import.ts raw output is 102 bytes; limit is 100',
      'subpath-import.ts gzip output is 52 bytes; limit is 50',
      'root and subpath imports do not produce identical tree-shaken code',
    ])
  })
})
