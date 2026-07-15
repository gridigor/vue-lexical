export interface TreeShakingFixtureResult {
  name: string
  code: string
  rawBytes: number
  gzipBytes: number
}

export interface TreeShakingBudgets {
  rawBytes: number
  gzipBytes: number
}

export function buildTreeShakingFixture(
  entry: string,
  repositoryRoot: string,
): Promise<TreeShakingFixtureResult>
export function findTreeShakingFailures(
  rootImport: TreeShakingFixtureResult,
  subpathImport: TreeShakingFixtureResult,
  budgets: TreeShakingBudgets,
): string[]
export function readFixtureSource(entry: string): Promise<string>
