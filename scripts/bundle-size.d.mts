export interface BundleSizeFile {
  path: string
  rawBytes: number
  gzipBytes: number
}

export interface BundleSizeReport {
  files: BundleSizeFile[]
  rawBytes: number
  gzipBytes: number
}

export interface BundleSizeBudgets {
  totalRawBytes: number
  totalGzipBytes: number
  moduleRawBytes: number
  moduleGzipBytes: number
}

export interface BundleSizeFailure {
  label: string
  actual: number
  limit: number
}

export function measureBundle(directory: string): Promise<BundleSizeReport>
export function findBudgetFailures(
  report: BundleSizeReport,
  budgets: BundleSizeBudgets,
): BundleSizeFailure[]
export function formatBytes(bytes: number): string
