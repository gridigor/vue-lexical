export interface RootExport {
  name: string
  sourceName: string
  typeOnly: boolean
}

export interface RootExportModule {
  subpath: string
  exports: RootExport[]
}

export interface ApiExport {
  name: string
  kind: string
  description: string
}

export interface ApiModule {
  subpath: string
  exports: ApiExport[]
}

export declare function parseRootExports(sourceText: string, fileName?: string): RootExportModule[]

export declare function describeModuleExports(
  sourceText: string,
  requestedExports: RootExport[],
  fileName?: string,
): ApiExport[]

export declare function renderApiReference(
  packageName: string,
  version: string,
  modules: ApiModule[],
): string
