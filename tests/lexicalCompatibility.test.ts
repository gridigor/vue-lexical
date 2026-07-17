import { describe, expect, it } from 'vitest'
import {
  collectLexicalPackageNames,
  createLexicalInstallSpecs,
} from '../scripts/lexical-compatibility.mjs'
import { assertLexicalBaseline } from '../scripts/lexical-baseline.mjs'

describe('Lexical compatibility automation', () => {
  it('collects and sorts unique Lexical packages from every dependency group', () => {
    expect(
      collectLexicalPackageNames({
        dependencies: { '@lexical/list': '^0.47.0', vue: '^3.5.0' },
        devDependencies: { '@lexical/react': '^0.47.0', lexical: '^0.47.0' },
        peerDependencies: { lexical: '^0.47.0' },
      }),
    ).toEqual(['@lexical/list', '@lexical/react', 'lexical'])
  })

  it('creates exact install specifications for stable and prerelease versions', () => {
    expect(createLexicalInstallSpecs(['@lexical/list', 'lexical'], '0.48.0')).toEqual([
      '@lexical/list@0.48.0',
      'lexical@0.48.0',
    ])
    expect(createLexicalInstallSpecs(['lexical'], '0.49.0-rc.1')).toEqual(['lexical@0.49.0-rc.1'])
  })

  it('rejects ranges, tags, and an empty package set', () => {
    expect(() => createLexicalInstallSpecs(['lexical'], '^0.48.0')).toThrow(
      'Expected an exact Lexical version',
    )
    expect(() => createLexicalInstallSpecs(['lexical'], 'latest')).toThrow(
      'Expected an exact Lexical version',
    )
    expect(() => createLexicalInstallSpecs([], '0.48.0')).toThrow('No Lexical packages were found')
  })

  it('accepts patches in the supported Lexical minor line', () => {
    expect(assertLexicalBaseline('^0.48.0', '0.48.0')).toBe('0.48')
    expect(assertLexicalBaseline('^0.48.0', '0.48.3')).toBe('0.48')
  })

  it('requires an explicit audit for a new Lexical minor line', () => {
    expect(() => assertLexicalBaseline('^0.48.0', '0.49.0')).toThrow(
      'outside the supported 0.48.x line',
    )
    expect(() => assertLexicalBaseline('~0.48.0', '0.48.0')).toThrow(
      'Expected a single Lexical minor range',
    )
    expect(() => assertLexicalBaseline('^0.48.0', 'latest')).toThrow(
      'Expected an exact installed Lexical version',
    )
  })
})
