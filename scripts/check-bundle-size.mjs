import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findBudgetFailures, formatBytes, measureBundle } from './bundle-size.mjs'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const budgets = {
  totalRawBytes: 144 * 1024,
  totalGzipBytes: 58 * 1024,
  moduleRawBytes: 12 * 1024,
  moduleGzipBytes: 3.5 * 1024,
}
const report = await measureBundle(resolve(repositoryRoot, 'dist'))

if (report.files.length === 0) {
  throw new Error('Bundle-size check found no JavaScript files in dist; run npm run build first')
}

const failures = findBudgetFailures(report, budgets)
const largestRaw = report.files.reduce((largest, file) =>
  file.rawBytes > largest.rawBytes ? file : largest,
)
const largestGzip = report.files.reduce((largest, file) =>
  file.gzipBytes > largest.gzipBytes ? file : largest,
)

process.stdout.write(
  [
    `Bundle-size check (${report.files.length} JavaScript modules):`,
    `- total raw: ${formatBytes(report.rawBytes)} / ${formatBytes(budgets.totalRawBytes)}`,
    `- total gzip: ${formatBytes(report.gzipBytes)} / ${formatBytes(budgets.totalGzipBytes)}`,
    `- largest raw: ${largestRaw.path} at ${formatBytes(largestRaw.rawBytes)} / ${formatBytes(budgets.moduleRawBytes)}`,
    `- largest gzip: ${largestGzip.path} at ${formatBytes(largestGzip.gzipBytes)} / ${formatBytes(budgets.moduleGzipBytes)}`,
    '',
  ].join('\n'),
)

if (failures.length > 0) {
  throw new Error(
    `Bundle-size budget exceeded:\n${failures
      .map(
        ({ label, actual, limit }) =>
          `- ${label}: ${formatBytes(actual)} exceeds ${formatBytes(limit)}`,
      )
      .join('\n')}`,
  )
}
