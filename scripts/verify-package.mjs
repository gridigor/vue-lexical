import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(args, cwd, captureOutput = false) {
  const result = spawnSync(npmCommand, args, {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: captureOutput ? 'pipe' : 'inherit',
  })

  if (result.status !== 0) {
    if (captureOutput) {
      process.stdout.write(result.stdout ?? '')
      process.stderr.write(result.stderr ?? '')
    }
    throw new Error(`npm ${args.join(' ')} failed with exit code ${result.status ?? 'unknown'}`)
  }

  return result.stdout ?? ''
}

function runRuntimeFixture(cwd) {
  const result = spawnSync(process.execPath, ['runtime.mjs'], { cwd, stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(
      `Runtime import verification failed with exit code ${result.status ?? 'unknown'}`,
    )
  }
}

const fixtureDirectory = await mkdtemp(join(tmpdir(), 'vue-lexical-package-'))

try {
  const packageJson = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), { encoding: 'utf8' }),
  )
  const packOutput = run(
    ['pack', '--json', '--pack-destination', fixtureDirectory],
    repositoryRoot,
    true,
  )
  const packResult = JSON.parse(packOutput)
  const packMetadata = Array.isArray(packResult)
    ? packResult[0]
    : typeof packResult.filename === 'string'
      ? packResult
      : Object.values(packResult).find((value) => typeof value?.filename === 'string')
  if (!packMetadata) {
    throw new Error('npm pack did not return package metadata')
  }
  const { filename } = packMetadata
  if (typeof filename !== 'string') {
    throw new Error('npm pack did not return a tarball filename')
  }
  const tarballPath = join(fixtureDirectory, filename).replaceAll('\\', '/')

  await writeFile(
    join(fixtureDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'vue-lexical-package-fixture',
        private: true,
        type: 'module',
        scripts: {
          build: 'vite build',
          typecheck: 'tsc --noEmit',
        },
        dependencies: {
          '@gridigor/vue-lexical': `file:${tarballPath}`,
          '@vitejs/plugin-vue': packageJson.devDependencies['@vitejs/plugin-vue'],
          lexical: packageJson.devDependencies.lexical,
          typescript: packageJson.devDependencies.typescript,
          vite: packageJson.devDependencies.vite,
          vue: packageJson.devDependencies.vue,
        },
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(fixtureDirectory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
        },
        include: ['main.ts'],
      },
      null,
      2,
    )}\n`,
  )
  await writeFile(
    join(fixtureDirectory, 'index.html'),
    '<div id="app"></div><script type="module" src="/main.ts"></script>\n',
  )
  await writeFile(
    join(fixtureDirectory, 'main.ts'),
    `import { ParagraphNode, type LexicalEditor } from 'lexical'
import { createApp, h } from 'vue'
import {
  ContentEditableElement,
  createEmptyHistoryState,
  getScrollParent,
  LexicalComposer,
  useDynamicPositioning,
  useLexicalTextEntity,
  type ContentEditableElementProps,
  type ContentEditableProps,
  type HistoryState,
  type InitialConfigType,
  type InitialEditorStateType,
} from '@gridigor/vue-lexical'
import type {
  ContentEditableElementProps as SubpathContentEditableElementProps,
  ContentEditableProps as SubpathContentEditableProps,
} from '@gridigor/vue-lexical/LexicalContentEditable'
import {
  createEmptyHistoryState as createEmptySubpathHistoryState,
  type HistoryState as SubpathHistoryState,
} from '@gridigor/vue-lexical/LexicalHistoryPlugin'
import {
  getScrollParent as getSubpathScrollParent,
  useDynamicPositioning as useSubpathDynamicPositioning,
} from '@gridigor/vue-lexical/LexicalTypeaheadMenuPlugin'
import type {
  InitialConfig,
  InitialEditorState,
} from '@gridigor/vue-lexical/LexicalComposer'
import NodeEventPlugin, {
  type NodeEventListener,
} from '@gridigor/vue-lexical/LexicalNodeEventPlugin'

const initialEditorState: InitialEditorStateType = null
const compatibleInitialEditorState: InitialEditorState = initialEditorState
const initialConfig: InitialConfigType = {
  namespace: 'PackageFixture',
  editorState: compatibleInitialEditorState,
  onError(error: Error) {
    throw error
  },
}
const compatibleInitialConfig: InitialConfig = initialConfig
const contentEditableProps: ContentEditableProps = { 'aria-label': 'Editor' }
const subpathContentEditableProps: SubpathContentEditableProps = contentEditableProps
const contentEditableElementProps = null as unknown as ContentEditableElementProps
const subpathContentEditableElementProps: SubpathContentEditableElementProps =
  contentEditableElementProps
const historyState: HistoryState = createEmptyHistoryState()
const subpathHistoryState: SubpathHistoryState = createEmptySubpathHistoryState()

const listener: NodeEventListener = (
  _event: Event,
  _editor: LexicalEditor,
  _nodeKey: string,
) => {}

void useLexicalTextEntity
void ContentEditableElement
void subpathContentEditableProps
void subpathContentEditableElementProps
void historyState
void subpathHistoryState
void getScrollParent
void useDynamicPositioning
void getSubpathScrollParent
void useSubpathDynamicPositioning

createApp({
  render: () =>
    h(LexicalComposer, { initialConfig: compatibleInitialConfig }, {
      default: () =>
        h(NodeEventPlugin, {
          eventListener: listener,
          eventType: 'click',
          nodeType: ParagraphNode,
        }),
    }),
}).mount('#app')
`,
  )
  await writeFile(
    join(fixtureDirectory, 'runtime.mjs'),
    `const root = await import('@gridigor/vue-lexical')
const nodeEvents = await import('@gridigor/vue-lexical/LexicalNodeEventPlugin')
const textEntity = await import('@gridigor/vue-lexical/useLexicalTextEntity')

if (
  !root.ContentEditableElement ||
  !root.createEmptyHistoryState ||
  !root.getScrollParent ||
  !root.LexicalComposer ||
  !root.useDynamicPositioning ||
  !nodeEvents.default ||
  !textEntity.useLexicalTextEntity
) {
  throw new Error('Expected package exports were not available')
}
`,
  )

  run(['install', '--ignore-scripts', '--no-audit', '--no-fund'], fixtureDirectory)
  run(['run', 'typecheck'], fixtureDirectory)
  run(['run', 'build'], fixtureDirectory)
  runRuntimeFixture(fixtureDirectory)

  process.stdout.write('Package tarball consumer verification passed.\n')
} finally {
  await rm(fixtureDirectory, { force: true, recursive: true })
}
