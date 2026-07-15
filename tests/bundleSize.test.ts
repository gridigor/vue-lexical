import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  findBudgetFailures,
  formatBytes,
  measureBundle,
  type BundleSizeBudgets,
} from '../scripts/bundle-size.mjs'

const temporaryDirectories: string[] = []
const budgets: BundleSizeBudgets = {
  totalRawBytes: 100,
  totalGzipBytes: 100,
  moduleRawBytes: 60,
  moduleGzipBytes: 100,
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  )
})

describe('bundle-size budgets', () => {
  it('measures JavaScript modules recursively and ignores other output', async () => {
    const directory = await createTemporaryDirectory()
    await mkdir(join(directory, 'nested'))
    await Promise.all([
      writeFile(join(directory, 'index.js'), 'export const root = true\n'),
      writeFile(join(directory, 'nested', 'feature.js'), 'export const feature = true\n'),
      writeFile(join(directory, 'index.d.ts'), 'export declare const root: boolean\n'),
    ])

    const report = await measureBundle(directory)

    expect(report.files.map(({ path }) => path)).toEqual(['index.js', 'nested/feature.js'])
    expect(report.rawBytes).toBe(53)
    expect(report.gzipBytes).toBeGreaterThan(0)
    expect(formatBytes(1536)).toBe('1.50 KiB')
  })

  it('reports every exceeded total and per-module budget', () => {
    const failures = findBudgetFailures(
      {
        files: [
          { path: 'small.js', rawBytes: 40, gzipBytes: 30 },
          { path: 'large.js', rawBytes: 70, gzipBytes: 50 },
        ],
        rawBytes: 110,
        gzipBytes: 80,
      },
      { ...budgets, totalGzipBytes: 70, moduleGzipBytes: 40 },
    )

    expect(failures).toEqual([
      { label: 'total raw JS', actual: 110, limit: 100 },
      { label: 'total gzip JS', actual: 80, limit: 70 },
      { label: 'largest raw module (large.js)', actual: 70, limit: 60 },
      { label: 'largest gzip module (large.js)', actual: 50, limit: 40 },
    ])
  })

  it('accepts measurements exactly at their limits and an empty report', () => {
    expect(
      findBudgetFailures(
        {
          files: [{ path: 'index.js', rawBytes: 60, gzipBytes: 40 }],
          rawBytes: 100,
          gzipBytes: 70,
        },
        { ...budgets, totalGzipBytes: 70, moduleGzipBytes: 40 },
      ),
    ).toEqual([])
    expect(findBudgetFailures({ files: [], rawBytes: 0, gzipBytes: 0 }, budgets)).toEqual([])
  })
})

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'vue-lexical-bundle-size-'))
  temporaryDirectories.push(directory)
  return directory
}
