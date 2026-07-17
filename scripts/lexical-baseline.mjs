export function assertLexicalBaseline(declaredRange, installedVersion) {
  const range = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(declaredRange)
  const version = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(installedVersion)

  if (range === null) {
    throw new Error(
      `Expected a single Lexical minor range such as ^0.48.0, received ${declaredRange}`,
    )
  }
  if (version === null) {
    throw new Error(`Expected an exact installed Lexical version, received ${installedVersion}`)
  }

  const supportedLine = `${range[1]}.${range[2]}`
  const installedLine = `${version[1]}.${version[2]}`
  if (supportedLine !== installedLine) {
    throw new Error(
      `Lexical ${installedVersion} is outside the supported ${supportedLine}.x line. ` +
        'Audit the upstream release, update the declared Lexical range, and release a new vue-lexical minor version.',
    )
  }

  return installedLine
}
