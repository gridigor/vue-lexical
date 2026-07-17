import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs'
import {
  CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  TOGGLE_CONNECT_COMMAND,
} from '@lexical/yjs'
import type { EditorState, LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  BLUR_COMMAND,
  createEditor,
  FOCUS_COMMAND,
  REDO_COMMAND,
  SKIP_COLLAB_TAG,
  UNDO_COMMAND,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { applyUpdate, Doc, type UndoManager } from 'yjs'
import { describe, expect, it, vi } from 'vitest'
import {
  createCollaborationContext,
  LexicalCollaboration,
  useCollaborationContext,
} from '../src/LexicalCollaborationContext'
import {
  CollaborationPlugin,
  CollaborationPluginV2__EXPERIMENTAL,
} from '../src/LexicalCollaborationPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'

const syncSpies = vi.hoisted(() => ({
  bindings: [] as unknown[],
  bindingsV2: [] as unknown[],
  cursorPositions: vi.fn<(binding: unknown, provider: unknown, options?: unknown) => void>(),
  lexicalToYjs: vi.fn(),
  lexicalToYjsV2: vi.fn(),
  renderSnapshotV2: vi.fn(),
  syncStateV2: vi.fn(),
  yjsToLexical: vi.fn(),
  yjsToLexicalV2: vi.fn(),
}))

vi.mock('@lexical/yjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lexical/yjs')>()
  return {
    ...actual,
    createYjsBinding(...args: Parameters<typeof actual.createYjsBinding>) {
      const binding = actual.createYjsBinding(...args)
      syncSpies.bindings.push(binding)
      return binding
    },
    createBindingV2__EXPERIMENTAL(
      ...args: Parameters<typeof actual.createBindingV2__EXPERIMENTAL>
    ) {
      const binding = actual.createBindingV2__EXPERIMENTAL(...args)
      syncSpies.bindingsV2.push(binding)
      return binding
    },
    renderSnapshot__EXPERIMENTAL(...args: Parameters<typeof actual.renderSnapshot__EXPERIMENTAL>) {
      syncSpies.renderSnapshotV2()
      return actual.renderSnapshot__EXPERIMENTAL(...args)
    },
    syncCursorPositions(...args: Parameters<typeof actual.syncCursorPositions>) {
      syncSpies.cursorPositions(...args)
      return actual.syncCursorPositions(...args)
    },
    syncLexicalUpdateToYjs(...args: Parameters<typeof actual.syncLexicalUpdateToYjs>) {
      syncSpies.lexicalToYjs()
      return actual.syncLexicalUpdateToYjs(...args)
    },
    syncLexicalUpdateToYjsV2__EXPERIMENTAL(
      ...args: Parameters<typeof actual.syncLexicalUpdateToYjsV2__EXPERIMENTAL>
    ) {
      syncSpies.lexicalToYjsV2()
      return actual.syncLexicalUpdateToYjsV2__EXPERIMENTAL(...args)
    },
    syncYjsStateToLexicalV2__EXPERIMENTAL(
      ...args: Parameters<typeof actual.syncYjsStateToLexicalV2__EXPERIMENTAL>
    ) {
      syncSpies.syncStateV2()
      return actual.syncYjsStateToLexicalV2__EXPERIMENTAL(...args)
    },
    syncYjsChangesToLexical(...args: Parameters<typeof actual.syncYjsChangesToLexical>) {
      syncSpies.yjsToLexical()
      return actual.syncYjsChangesToLexical(...args)
    },
    syncYjsChangesToLexicalV2__EXPERIMENTAL(
      ...args: Parameters<typeof actual.syncYjsChangesToLexicalV2__EXPERIMENTAL>
    ) {
      syncSpies.yjsToLexicalV2()
      return actual.syncYjsChangesToLexicalV2__EXPERIMENTAL(...args)
    },
  }
})

type ProviderEvent = 'reload' | 'status' | 'sync' | 'update'
type ProviderListener = (...args: unknown[]) => void

class TestAwareness implements ProviderAwareness {
  readonly listeners = new Set<() => void>()
  readonly states = new Map<number, UserState>()
  localState: UserState | null = null
  throwOnClear = false

  getLocalState = () => this.localState
  getStates = () => this.states
  on = (_type: 'update', listener: () => void) => this.listeners.add(listener)
  off = (_type: 'update', listener: () => void) => this.listeners.delete(listener)
  setLocalState = (state: UserState | null) => {
    if (state === null && this.throwOnClear) {
      throw new Error('awareness already destroyed')
    }
    this.localState = state
  }
  setLocalStateField = (field: string, value: unknown) => {
    this.localState = { ...this.localState!, [field]: value }
  }

  emitUpdate(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

class TestProvider {
  readonly awareness = new TestAwareness()
  readonly listeners = new Map<ProviderEvent, Set<ProviderListener>>()
  readonly connect = vi.fn<() => void | Promise<void>>(() => {
    this.connected = true
  })
  readonly disconnect = vi.fn<() => void>(() => {
    this.connected = false
  })
  connected = false

  constructor(
    readonly doc?: Doc,
    readonly peers?: TestProvider[],
  ) {
    doc?.on('update', (update, origin) => {
      if (!this.connected || origin instanceof TestProvider) {
        return
      }
      for (const peer of peers ?? []) {
        if (peer !== this && peer.connected && peer.doc !== undefined) {
          applyUpdate(peer.doc, update, this)
        }
      }
    })
  }

  on(type: ProviderEvent, listener: ProviderListener): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  off(type: ProviderEvent, listener: ProviderListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type: ProviderEvent, value: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(value)
    }
  }

  asProvider(): Provider {
    return this as unknown as Provider
  }
}

function editorText(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent())
}

function createCapture(capture: (editor: LexicalEditor) => void) {
  return defineComponent({
    setup() {
      capture(useLexicalComposer())
      return () => null
    },
  })
}

describe('LexicalCollaborationPlugin', () => {
  it('synchronizes multiple editors, awareness, connection state, and shared history', async () => {
    const contexts = [createCollaborationContext(), createCollaborationContext()]
    const providers: TestProvider[] = []
    const editors: LexicalEditor[] = []
    const syncCursors = vi.fn()
    const cursorTarget = document.createElement('aside')
    const cursorTargetRef = ref<HTMLElement | null>(cursorTarget)
    document.body.append(cursorTarget)
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => new DOMRect(),
    })

    const providerFactory = (id: string, docMap: Map<string, Doc>) => {
      const doc = new Doc()
      docMap.set(id, doc)
      const provider = new TestProvider(doc, providers)
      providers.push(provider)
      return provider.asProvider()
    }

    const Editor = (index: number) => {
      const Capture = createCapture((editor) => {
        editors[index] = editor
      })
      return h(
        LexicalComposer,
        {
          initialConfig: {
            namespace: `collaboration-${index}`,
            editorState: null,
            onError(error: Error) {
              throw error
            },
          },
        },
        {
          default: () => [
            h(ContentEditable),
            h(Capture),
            h(CollaborationPlugin, {
              id: 'shared-document',
              providerFactory,
              shouldBootstrap: index === 0,
              username: 'Ada',
              cursorColor: '#123456',
              awarenessData: { role: 'author' },
              cursorsContainerRef: index === 0 ? cursorTarget : cursorTargetRef,
              syncCursorPositionsFn: syncCursors,
              selectionHighlight: true,
              rootName: 'custom-root',
            }),
          ],
        },
      )
    }

    const App = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(LexicalCollaboration, { context: contexts[0] }, { default: () => Editor(0) }),
            h(LexicalCollaboration, { context: contexts[1] }, { default: () => Editor(1) }),
          ])
      },
    })
    const wrapper = mount(App, {
      attachTo: document.body,
    })
    await nextTick()

    expect(contexts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#123456',
          isCollabActive: true,
          name: 'Ada',
        }),
      ]),
    )
    expect(providers).toHaveLength(2)
    expect(providers.every((provider) => provider.doc?.share.has('custom-root'))).toBe(true)
    expect(providers.every((provider) => provider.connect.mock.calls.length === 1)).toBe(true)
    expect(cursorTarget.querySelectorAll('div')).toHaveLength(2)

    editors[0].getRootElement()?.focus()
    providers[0].emit('status', { status: 'connected' })
    providers[0].emit('status', { status: 'disconnected' })
    providers[0].emit('sync', true)
    providers[1].emit('sync', true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editors[0].getEditorState().read(() => $getRoot().getChildrenSize())).toBeGreaterThan(0)

    const undoManager = (editors[0] as LexicalEditor & Record<symbol, UndoManager | undefined>)[
      Symbol.for('@lexical/yjs/UndoManager')
    ]
    undoManager?.stopCapturing()

    const lexicalSyncCount = syncSpies.lexicalToYjs.mock.calls.length
    const yjsSyncCount = syncSpies.yjsToLexical.mock.calls.length
    editors[0].update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected a paragraph')
        }
        paragraph.append($createTextNode('Hello collaboration'))
      },
      { discrete: true },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(syncSpies.lexicalToYjs.mock.calls.length).toBeGreaterThan(lexicalSyncCount)
    expect(syncSpies.yjsToLexical.mock.calls.length).toBeGreaterThan(yjsSyncCount)
    expect(editorText(editors[1])).toContain('Hello collaboration')
    expect(editorText(editors[1])).toBe(editorText(editors[0]))

    undoManager?.stopCapturing()
    editors[0].dispatchCommand(UNDO_COMMAND, undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[0])).not.toContain('Hello collaboration')
    expect(editorText(editors[1])).toBe(editorText(editors[0]))
    editors[0].dispatchCommand(REDO_COMMAND, undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[1])).toContain('Hello collaboration')

    editors[0].dispatchCommand(FOCUS_COMMAND, new FocusEvent('focus'))
    expect(providers[0].awareness.localState?.focusing).toBe(true)
    editors[0].dispatchCommand(BLUR_COMMAND, new FocusEvent('blur'))
    expect(providers[0].awareness.localState?.focusing).toBe(false)
    providers[0].awareness.emitUpdate()
    expect(syncSpies.cursorPositions).toHaveBeenCalledWith(expect.anything(), providers[0], {
      selectionHighlight: true,
    })

    editors[0].dispatchCommand(TOGGLE_CONNECT_COMMAND, false)
    editors[0].dispatchCommand(TOGGLE_CONNECT_COMMAND, true)
    expect(providers[0].disconnect).toHaveBeenCalledTimes(1)
    expect(providers[0].connect).toHaveBeenCalledTimes(2)

    editors[0].update(() => $getRoot().clear(), { discrete: true, tag: SKIP_COLLAB_TAG })
    expect(editorText(editors[1])).toContain('Hello collaboration')

    const replacementDoc = new Doc()
    const firstBinding = syncSpies.bindings[0] as {
      cursors: Map<
        number,
        {
          color: string
          name: string
          selection: {
            anchor: { key: string; offset: number }
            caret: HTMLElement
            color: string
            focus: { key: string; offset: number }
            highlight: Highlight | null
            highlightName: string
            name: HTMLSpanElement
            selections: HTMLElement[]
          } | null
        }
      >
    }
    const deleteHighlight = vi.fn()
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: { highlights: { delete: deleteHighlight } },
    })
    firstBinding.cursors.set(42, {
      color: 'red',
      name: 'Remote',
      selection: {
        anchor: { key: 'root', offset: 0 },
        caret: document.createElement('span'),
        color: 'red',
        focus: { key: 'root', offset: 0 },
        highlight: {} as Highlight,
        highlightName: 'remote-selection',
        name: document.createElement('span'),
        selections: [],
      },
    })
    providers[0].emit('reload', replacementDoc)
    providers[0].emit('sync', true)
    expect(contexts[0].yjsDocMap.get('shared-document')).toBe(replacementDoc)
    expect(deleteHighlight).toHaveBeenCalledWith('remote-selection')
    expect(firstBinding.cursors.size).toBe(0)

    window.dispatchEvent(new Event('pagehide'))
    expect(providers[0].awareness.localState).toBeNull()
    providers[0].awareness.throwOnClear = true
    window.dispatchEvent(new Event('beforeunload'))

    wrapper.unmount()
    expect(contexts.every((context) => !context.isCollabActive)).toBe(true)
    expect(providers.every((provider) => provider.disconnect.mock.calls.length >= 1)).toBe(true)
    expect(providers.every((provider) => provider.listeners.size > 0)).toBe(true)
    expect(providers.every((provider) => provider.awareness.listeners.size === 0)).toBe(true)
    expect(cursorTarget.childElementCount).toBe(0)
    cursorTarget.remove()
    delete (Range.prototype as Partial<Range>).getBoundingClientRect
    delete (globalThis as { CSS?: typeof CSS }).CSS
  })

  it('supports function bootstrap state and an async provider teardown', async () => {
    let editor: LexicalEditor | undefined
    let contextDuringMount = false
    const provider = new TestProvider()
    let resolveConnection: (() => void) | undefined
    provider.connect.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConnection = resolve
      }),
    )
    const Capture = createCapture((value) => {
      editor = value
    })
    const ContextCapture = defineComponent({
      setup() {
        contextDuringMount = useCollaborationContext().isCollabActive
        return () => null
      },
    })

    const wrapper = mount(LexicalCollaboration, {
      slots: {
        default: () => [
          h(ContextCapture),
          h(
            LexicalComposer,
            {
              initialConfig: {
                namespace: 'async-collaboration',
                editorState: null,
                onError(error: Error) {
                  throw error
                },
              },
            },
            {
              default: () => [
                h(Capture),
                h(CollaborationPlugin, {
                  id: 'async',
                  providerFactory(_id: string, docMap: Map<string, Doc>) {
                    docMap.set('async', new Doc())
                    return provider.asProvider()
                  },
                  shouldBootstrap: true,
                  initialEditorState() {
                    $getRoot().append(
                      $createParagraphNode().append($createTextNode('Bootstrapped')),
                    )
                  },
                }),
              ],
            },
          ),
        ],
      },
    })
    await nextTick()
    expect(contextDuringMount).toBe(false)

    provider.emit('sync', true)
    await Promise.resolve()
    expect(editorText(editor!)).toBe('Bootstrapped')
    wrapper.unmount()
    expect(provider.disconnect).not.toHaveBeenCalled()
    resolveConnection?.()
    await Promise.resolve()
    expect(provider.disconnect).toHaveBeenCalledOnce()
  })

  it('bootstraps serialized and EditorState values without replacing existing content', async () => {
    const createState = (text: string): EditorState => {
      const source = createEditor()
      source.update(
        () => {
          $getRoot().append($createParagraphNode().append($createTextNode(text)))
        },
        { discrete: true },
      )
      return source.getEditorState()
    }
    const objectState = createState('Object state')
    const serializedState = JSON.stringify(createState('Serialized state').toJSON())

    const mountCase = async (
      composerState: null | ((editor: LexicalEditor) => void),
      collaborationState: string | EditorState | ((editor: LexicalEditor) => void),
    ) => {
      const provider = new TestProvider()
      let editor: LexicalEditor | undefined
      const Capture = createCapture((value) => {
        editor = value
      })
      const wrapper = mount(LexicalCollaboration, {
        slots: {
          default: () =>
            h(
              LexicalComposer,
              {
                initialConfig: {
                  namespace: 'bootstrap-state',
                  editorState: composerState,
                  onError(error: Error) {
                    throw error
                  },
                },
              },
              {
                default: () => [
                  h(Capture),
                  h(CollaborationPlugin, {
                    id: 'bootstrap-state',
                    providerFactory(_id: string, docMap: Map<string, Doc>) {
                      docMap.set('bootstrap-state', new Doc())
                      return provider.asProvider()
                    },
                    shouldBootstrap: true,
                    initialEditorState: collaborationState,
                  }),
                ],
              },
            ),
        },
      })
      await nextTick()
      provider.emit('sync', true)
      await Promise.resolve()
      return { editor: editor!, wrapper }
    }

    const serialized = await mountCase(null, serializedState)
    expect(editorText(serialized.editor)).toBe('Serialized state')
    serialized.wrapper.unmount()

    const object = await mountCase(null, objectState)
    expect(editorText(object.editor)).toBe('Object state')
    object.wrapper.unmount()

    const bootstrap = vi.fn(() => {
      $getRoot().append($createParagraphNode().append($createTextNode('Should not run')))
    })
    const existing = await mountCase(() => {
      $getRoot().append($createParagraphNode().append($createTextNode('Existing state')))
    }, bootstrap)
    expect(editorText(existing.editor)).toBe('Existing state')
    expect(bootstrap).not.toHaveBeenCalled()
    existing.wrapper.unmount()
  })

  it('requires the provider factory to register its Yjs document', () => {
    const provider = new TestProvider()

    expect(() =>
      mount(LexicalCollaboration, {
        slots: {
          default: () =>
            h(
              LexicalComposer,
              {
                initialConfig: {
                  namespace: 'missing-collaboration-document',
                  editorState: null,
                  onError(error: Error) {
                    throw error
                  },
                },
              },
              {
                default: () =>
                  h(CollaborationPlugin, {
                    id: 'missing-document',
                    providerFactory: () => provider.asProvider(),
                    shouldBootstrap: false,
                  }),
              },
            ),
        },
      }),
    ).toThrow('providerFactory must add the document to yjsDocMap')
  })

  it('supports external V2 documents and providers, diff views, and shared history', async () => {
    const contexts = [createCollaborationContext(), createCollaborationContext()]
    const docs = [new Doc({ gc: false }), new Doc({ gc: false })]
    const providers: TestProvider[] = []
    const editors: LexicalEditor[] = []
    const cursorTarget = document.createElement('aside')
    const cursorTargetRef = ref<HTMLElement | null>(cursorTarget)
    document.body.append(cursorTarget)
    for (const doc of docs) {
      providers.push(new TestProvider(doc, providers))
    }

    const Editor = (index: number) => {
      const Capture = createCapture((editor) => {
        editors[index] = editor
      })
      return h(
        LexicalComposer,
        {
          initialConfig: {
            namespace: `collaboration-v2-${index}`,
            editorState: null,
            onError(error: Error) {
              throw error
            },
          },
        },
        {
          default: () => [
            h(ContentEditable),
            h(Capture),
            h(CollaborationPluginV2__EXPERIMENTAL, {
              id: 'external-document',
              doc: docs[index]!,
              provider: providers[index]!.asProvider(),
              __shouldBootstrapUnsafe: index === 0,
              username: index === 0 ? 'Ada' : 'Grace',
              cursorColor: index === 0 ? '#123456' : '#654321',
              awarenessData: { role: 'author' },
              cursorsContainerRef: index === 0 ? cursorTarget : cursorTargetRef,
              selectionHighlight: true,
              rootName: 'custom-root-v2',
            }),
          ],
        },
      )
    }

    const App = defineComponent({
      setup() {
        return () =>
          h('div', [
            h(LexicalCollaboration, { context: contexts[0] }, { default: () => Editor(0) }),
            h(LexicalCollaboration, { context: contexts[1] }, { default: () => Editor(1) }),
          ])
      },
    })
    const bindingCount = syncSpies.bindingsV2.length
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()

    expect(syncSpies.bindingsV2).toHaveLength(bindingCount + 2)
    expect(docs.every((doc) => doc.share.has('custom-root-v2'))).toBe(true)
    expect(providers.every((provider) => provider.connect.mock.calls.length === 1)).toBe(true)
    expect(contexts.every((context) => context.isCollabActive)).toBe(true)
    expect(contexts[0].yjsDocMap.get('external-document')).toBe(docs[0])
    expect(contexts[1].yjsDocMap.get('external-document')).toBe(docs[1])
    expect(cursorTarget.querySelectorAll('div')).toHaveLength(2)

    providers[0].emit('status', { status: 'connected' })
    providers[0].emit('status', { status: 'disconnected' })
    providers[0].emit('sync', false)
    providers[0].emit('sync', true)
    providers[0].emit('sync', true)
    providers[1].emit('sync', true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[0])).toBe('')

    const undoManager = (editors[0] as LexicalEditor & Record<symbol, UndoManager | undefined>)[
      Symbol.for('@lexical/yjs/UndoManager')
    ]
    undoManager?.stopCapturing()
    const lexicalSyncCount = syncSpies.lexicalToYjsV2.mock.calls.length
    const yjsSyncCount = syncSpies.yjsToLexicalV2.mock.calls.length
    editors[0].update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected a paragraph')
        }
        paragraph.append($createTextNode('External V2 collaboration'))
      },
      { discrete: true },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(syncSpies.lexicalToYjsV2.mock.calls.length).toBeGreaterThan(lexicalSyncCount)
    expect(syncSpies.yjsToLexicalV2.mock.calls.length).toBeGreaterThan(yjsSyncCount)
    expect(editorText(editors[1])).toBe('External V2 collaboration')

    undoManager?.stopCapturing()
    editors[0].dispatchCommand(UNDO_COMMAND, undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[1])).toBe(editorText(editors[0]))
    editors[0].dispatchCommand(REDO_COMMAND, undefined)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[1])).toBe('External V2 collaboration')

    providers[0].awareness.emitUpdate()
    expect(syncSpies.cursorPositions).toHaveBeenCalledWith(expect.anything(), providers[0], {
      selectionHighlight: true,
    })
    editors[0].dispatchCommand(FOCUS_COMMAND, new FocusEvent('focus'))
    expect(providers[0].awareness.localState?.focusing).toBe(true)
    editors[0].dispatchCommand(BLUR_COMMAND, new FocusEvent('blur'))
    expect(providers[0].awareness.localState?.focusing).toBe(false)
    editors[0].dispatchCommand(TOGGLE_CONNECT_COMMAND, false)
    editors[0].dispatchCommand(TOGGLE_CONNECT_COMMAND, true)
    expect(providers[0].disconnect).toHaveBeenCalledOnce()
    expect(providers[0].connect).toHaveBeenCalledTimes(2)

    editors[0].dispatchCommand(CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, undefined)
    editors[0].dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {})
    editors[0].dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {})
    expect(syncSpies.renderSnapshotV2).toHaveBeenCalledTimes(2)
    editors[0].dispatchCommand(CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, undefined)
    expect(syncSpies.syncStateV2).toHaveBeenCalledOnce()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(editorText(editors[0])).toBe('External V2 collaboration')

    const skipSyncCount = syncSpies.lexicalToYjsV2.mock.calls.length
    editors[0].update(() => $getRoot().clear(), { discrete: true, tag: SKIP_COLLAB_TAG })
    expect(syncSpies.lexicalToYjsV2).toHaveBeenCalledTimes(skipSyncCount)

    window.dispatchEvent(new Event('pagehide'))
    expect(providers[0].awareness.localState).toBeNull()
    wrapper.unmount()
    expect(contexts.every((context) => !context.isCollabActive)).toBe(true)
    expect(contexts.every((context) => !context.yjsDocMap.has('external-document'))).toBe(true)
    expect(providers.every((provider) => provider.disconnect.mock.calls.length >= 1)).toBe(true)
    expect(providers.every((provider) => provider.awareness.listeners.size === 0)).toBe(true)
    expect(cursorTarget.childElementCount).toBe(0)
    cursorTarget.remove()
  })

  it('waits for an asynchronous external V2 provider before disconnecting', async () => {
    const provider = new TestProvider()
    let resolveConnection: (() => void) | undefined
    provider.connect.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveConnection = resolve
      }),
    )
    const wrapper = mount(LexicalCollaboration, {
      slots: {
        default: () =>
          h(
            LexicalComposer,
            {
              initialConfig: {
                namespace: 'async-collaboration-v2',
                editorState: null,
                onError(error: Error) {
                  throw error
                },
              },
            },
            {
              default: () =>
                h(CollaborationPluginV2__EXPERIMENTAL, {
                  id: 'async-v2',
                  doc: new Doc(),
                  provider: provider.asProvider(),
                }),
            },
          ),
      },
    })
    await nextTick()
    provider.awareness.throwOnClear = true
    wrapper.unmount()
    expect(provider.disconnect).not.toHaveBeenCalled()
    resolveConnection?.()
    await Promise.resolve()
    expect(provider.disconnect).toHaveBeenCalledOnce()
  })
})
