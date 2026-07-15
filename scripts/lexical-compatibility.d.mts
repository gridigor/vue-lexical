export interface LexicalPackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

export declare function collectLexicalPackageNames(packageJson: LexicalPackageJson): string[]

export declare function createLexicalInstallSpecs(packageNames: string[], version: string): string[]
