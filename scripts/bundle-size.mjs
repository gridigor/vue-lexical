import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

export async function measureBundle(directory) {
  const root = resolve(directory)
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const paths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => resolve(entry.parentPath, entry.name))
    .sort()

  const files = await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(path)

      return {
        path: relative(root, path).replaceAll('\\', '/'),
        rawBytes: contents.byteLength,
        gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
      }
    }),
  )

  return {
    files,
    rawBytes: files.reduce((total, file) => total + file.rawBytes, 0),
    gzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0),
  }
}

export function findBudgetFailures(report, budgets) {
  const largestRaw = report.files.reduce(
    (largest, file) => (file.rawBytes > largest.rawBytes ? file : largest),
    { path: 'none', rawBytes: 0, gzipBytes: 0 },
  )
  const largestGzip = report.files.reduce(
    (largest, file) => (file.gzipBytes > largest.gzipBytes ? file : largest),
    { path: 'none', rawBytes: 0, gzipBytes: 0 },
  )
  const measurements = [
    ['total raw JS', report.rawBytes, budgets.totalRawBytes],
    ['total gzip JS', report.gzipBytes, budgets.totalGzipBytes],
    [`largest raw module (${largestRaw.path})`, largestRaw.rawBytes, budgets.moduleRawBytes],
    [`largest gzip module (${largestGzip.path})`, largestGzip.gzipBytes, budgets.moduleGzipBytes],
  ]

  return measurements
    .filter(([, actual, limit]) => actual > limit)
    .map(([label, actual, limit]) => ({ label, actual, limit }))
}

export function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}
