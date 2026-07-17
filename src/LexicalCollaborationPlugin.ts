import type {
  BaseBinding,
  Binding,
  BindingV2,
  ExcludedProperties,
  Provider,
  SyncCursorPositionsFn,
} from '@lexical/yjs'
import {
  CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  CONNECTED_COMMAND,
  createBindingV2__EXPERIMENTAL,
  createYjsBinding,
  createUndoManager,
  DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
  initLocalState,
  removeCursorHighlightRule,
  renderSnapshot__EXPERIMENTAL,
  setLocalStateFocus,
  syncCursorPositions,
  syncLexicalUpdateToYjs,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexical,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
  syncYjsStateToLexicalV2__EXPERIMENTAL,
  TOGGLE_CONNECT_COMMAND,
} from '@lexical/yjs'
import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  BLUR_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  FOCUS_COMMAND,
  getActiveElement,
  HISTORY_MERGE_TAG,
  mergeRegister,
  REDO_COMMAND,
  SKIP_COLLAB_TAG,
  UNDO_COMMAND,
} from 'lexical'
import type { Doc, Snapshot, Transaction, UndoManager, XmlElement, XmlText, YEvent } from 'yjs'
import { UndoManager as YjsUndoManager } from 'yjs'
import type { PropType, Ref } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, shallowRef, Teleport, toRaw } from 'vue'
import { useCollaborationContext } from './LexicalCollaborationContext'
import { useLexicalComposer } from './LexicalComposerContext'
import type { InitialEditorState } from './initializeEditor'

export type CollaborationProviderFactory = (id: string, yjsDocMap: Map<string, Doc>) => Provider

export type CursorsContainer = HTMLElement | Readonly<Ref<HTMLElement | null>>

export interface CollaborationPluginProps {
  id: string
  providerFactory: CollaborationProviderFactory
  shouldBootstrap: boolean
  username?: string
  cursorColor?: string
  cursorsContainerRef?: CursorsContainer
  initialEditorState?: InitialEditorState
  excludedProperties?: ExcludedProperties
  awarenessData?: object
  syncCursorPositionsFn?: SyncCursorPositionsFn
  selectionHighlight?: boolean
  rootName?: string
}

export interface CollaborationPluginV2Props {
  id: string
  doc: Doc
  provider: Provider
  __shouldBootstrapUnsafe?: boolean
  username?: string
  cursorColor?: string
  cursorsContainerRef?: CursorsContainer
  excludedProperties?: ExcludedProperties
  awarenessData?: object
  selectionHighlight?: boolean
  rootName?: string
}

interface CollaborationSessionOptions extends CollaborationPluginProps {
  editor: LexicalEditor
  name: string
  color: string
  yjsDocMap: Map<string, Doc>
  onBinding(binding: Binding | null): void
}

interface CollaborationSessionV2Options extends CollaborationPluginV2Props {
  editor: LexicalEditor
  name: string
  color: string
  yjsDocMap: Map<string, Doc>
  onBinding(binding: BindingV2 | null): void
}

const COLLAB_UNDO_MANAGER = Symbol.for('@lexical/yjs/UndoManager')

function getCursorsContainer(container?: CursorsContainer): HTMLElement {
  if (container instanceof HTMLElement) {
    return container
  }

  return container?.value ?? document.body
}

function initializeCollaborationEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorState,
): void {
  editor.update(
    () => {
      const root = $getRoot()
      if (!root.isEmpty()) {
        return
      }

      if (typeof initialEditorState === 'string') {
        editor.setEditorState(editor.parseEditorState(initialEditorState), {
          tag: HISTORY_MERGE_TAG,
        })
      } else if (typeof initialEditorState === 'function') {
        initialEditorState(editor)
      } else if (initialEditorState != null) {
        editor.setEditorState(initialEditorState, { tag: HISTORY_MERGE_TAG })
      } else {
        const paragraph = $createParagraphNode()
        root.append(paragraph)
        const rootElement = editor.getRootElement()

        if (
          $getSelection() !== null ||
          (rootElement !== null && getActiveElement(rootElement) === rootElement)
        ) {
          paragraph.select()
        }
      }
    },
    { discrete: true, tag: HISTORY_MERGE_TAG },
  )
}

function registerYjsHistory(
  editor: LexicalEditor,
  binding: BaseBinding,
  sharedType: XmlText | XmlElement,
): () => void {
  const undoManager = createUndoManager(binding, sharedType)
  const editorWithUndoManager = editor as LexicalEditor & Record<symbol, UndoManager | undefined>
  editorWithUndoManager[COLLAB_UNDO_MANAGER] = undoManager

  const updateUndoRedoStates = () => {
    editor.dispatchCommand(CAN_UNDO_COMMAND, undoManager.undoStack.length > 0)
    editor.dispatchCommand(CAN_REDO_COMMAND, undoManager.redoStack.length > 0)
  }

  undoManager.on('stack-item-added', updateUndoRedoStates)
  undoManager.on('stack-item-popped', updateUndoRedoStates)
  undoManager.on('stack-cleared', updateUndoRedoStates)

  const unregisterCommands = mergeRegister(
    editor.registerCommand(
      UNDO_COMMAND,
      () => {
        undoManager.undo()
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REDO_COMMAND,
      () => {
        undoManager.redo()
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  )

  return () => {
    unregisterCommands()
    undoManager.off('stack-item-added', updateUndoRedoStates)
    undoManager.off('stack-item-popped', updateUndoRedoStates)
    undoManager.off('stack-cleared', updateUndoRedoStates)
    undoManager.destroy()
    if (editorWithUndoManager[COLLAB_UNDO_MANAGER] === undoManager) {
      delete editorWithUndoManager[COLLAB_UNDO_MANAGER]
    }
  }
}

function clearEditorSkipCollab(editor: LexicalEditor, binding: BaseBinding): void {
  editor.update(
    () => {
      $getRoot().clear().select()
    },
    { discrete: true, tag: SKIP_COLLAB_TAG },
  )
  binding.cursorsContainer?.replaceChildren()
  for (const cursor of binding.cursors.values()) {
    const selection = cursor.selection
    if (
      selection !== null &&
      selection.highlight !== null &&
      typeof CSS !== 'undefined' &&
      CSS.highlights !== undefined
    ) {
      CSS.highlights.delete(selection.highlightName)
      removeCursorHighlightRule(binding, selection.highlightName)
    }
    cursor.selection = null
  }
  binding.cursors.clear()
}

function startCollaborationSession(options: CollaborationSessionOptions): () => void {
  const {
    awarenessData,
    color,
    editor,
    excludedProperties,
    id,
    initialEditorState,
    name,
    onBinding,
    providerFactory,
    rootName,
    selectionHighlight = false,
    shouldBootstrap,
    syncCursorPositionsFn = syncCursorPositions,
    yjsDocMap,
  } = options
  const provider = providerFactory(id, yjsDocMap)
  const doc = yjsDocMap.get(id)
  if (doc === undefined) {
    throw new Error('CollaborationPlugin: providerFactory must add the document to yjsDocMap')
  }
  const binding = createYjsBinding({
    doc,
    docMap: yjsDocMap,
    editor,
    id,
    excludedProperties,
    rootName,
  })
  let isReloadingDoc = false
  let disposed = false
  onBinding(binding)

  const onYjsTreeChanges = (events: YEvent<XmlText>[], transaction: Transaction) => {
    if (transaction.origin !== binding) {
      syncYjsChangesToLexical(
        binding,
        provider,
        events,
        transaction.origin instanceof YjsUndoManager,
        syncCursorPositionsFn,
      )
    }
  }
  binding.root.getSharedType().observeDeep(onYjsTreeChanges)

  const unregisterUpdate = editor.registerUpdateListener(
    ({ prevEditorState, editorState, dirtyLeaves, dirtyElements, normalizedNodes, tags }) => {
      if (!tags.has(SKIP_COLLAB_TAG)) {
        syncLexicalUpdateToYjs(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        )
      }
    },
  )

  const onReload = (replacementDoc: Doc) => {
    clearEditorSkipCollab(editor, binding)
    yjsDocMap.set(id, replacementDoc)
    isReloadingDoc = true
  }
  const onStatus = ({ status }: { status: string }) => {
    editor.dispatchCommand(CONNECTED_COMMAND, status === 'connected')
  }
  const onSync = (isSynced: boolean) => {
    if (
      isSynced &&
      !isReloadingDoc &&
      shouldBootstrap &&
      binding.root.isEmpty() &&
      binding.root.getSharedType().length === 0
    ) {
      initializeCollaborationEditor(editor, initialEditorState)
    }
    isReloadingDoc = false
  }
  const onAwarenessUpdate = () => {
    syncCursorPositions(binding, provider, { selectionHighlight })
  }

  provider.on('reload', onReload)
  provider.on('status', onStatus)
  provider.on('sync', onSync)
  provider.awareness.on('update', onAwarenessUpdate)

  const rootElement = editor.getRootElement()
  initLocalState(
    provider,
    name,
    color,
    rootElement !== null && getActiveElement(rootElement) === rootElement,
    awarenessData ?? {},
  )

  const connect = () => provider.connect()
  const disconnect = () => {
    try {
      provider.disconnect()
    } catch {
      // A provider may already be disconnected during teardown.
    }
  }
  const connection = connect()

  const unregisterCommands = mergeRegister(
    editor.registerCommand(
      TOGGLE_CONNECT_COMMAND,
      (shouldConnect) => {
        if (shouldConnect) {
          connect()
        } else {
          disconnect()
        }
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        setLocalStateFocus(provider, name, color, true, awarenessData ?? {})
        return false
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      BLUR_COMMAND,
      () => {
        setLocalStateFocus(provider, name, color, false, awarenessData ?? {})
        return false
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  )
  const unregisterHistory = registerYjsHistory(editor, binding, binding.root.getSharedType())

  const clearAwareness = () => {
    try {
      provider.awareness.setLocalState(null)
    } catch {
      // The provider may already have destroyed its awareness instance.
    }
  }
  window.addEventListener('beforeunload', clearAwareness)
  window.addEventListener('pagehide', clearAwareness)

  return () => {
    disposed = true
    window.removeEventListener('beforeunload', clearAwareness)
    window.removeEventListener('pagehide', clearAwareness)
    clearAwareness()
    unregisterHistory()
    unregisterCommands()
    unregisterUpdate()
    provider.awareness.off('update', onAwarenessUpdate)
    provider.off('reload', onReload)
    provider.off('status', onStatus)
    provider.off('sync', onSync)
    binding.root.getSharedType().unobserveDeep(onYjsTreeChanges)
    binding.root.destroy(binding)
    onBinding(null)

    if (connection instanceof Promise) {
      void connection.then(() => {
        if (disposed) {
          disconnect()
        }
      })
    } else {
      disconnect()
    }
  }
}

function startCollaborationSessionV2(options: CollaborationSessionV2Options): () => void {
  const {
    __shouldBootstrapUnsafe: shouldBootstrap = false,
    awarenessData,
    color,
    doc,
    editor,
    excludedProperties,
    id,
    name,
    onBinding,
    provider,
    rootName,
    selectionHighlight = false,
    yjsDocMap,
  } = options
  const binding = createBindingV2__EXPERIMENTAL(editor, id, doc, yjsDocMap, {
    excludedProperties,
    rootName,
  })
  let disposed = false
  let diffSnapshots: { prevSnapshot?: Snapshot; snapshot?: Snapshot } | null = null
  yjsDocMap.set(id, doc)
  onBinding(binding)

  const startEditorSync = () => {
    const onYjsTreeChanges = (events: YEvent<XmlText | XmlElement>[], transaction: Transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events,
          transaction,
          transaction.origin instanceof YjsUndoManager,
        )
      }
    }
    binding.root.observeDeep(onYjsTreeChanges)
    const unregisterUpdate = editor.registerUpdateListener(
      ({ prevEditorState, editorState, dirtyLeaves, dirtyElements, normalizedNodes, tags }) => {
        if (!tags.has(SKIP_COLLAB_TAG)) {
          syncLexicalUpdateToYjsV2__EXPERIMENTAL(
            binding,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            dirtyLeaves,
            normalizedNodes,
            tags,
          )
        }
      },
    )

    return () => {
      binding.root.unobserveDeep(onYjsTreeChanges)
      unregisterUpdate()
    }
  }
  let stopEditorSync = startEditorSync()

  const unregisterDiffCommands = mergeRegister(
    editor.registerCommand(
      CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
      () => {
        if (diffSnapshots !== null) {
          diffSnapshots = null
          syncYjsStateToLexicalV2__EXPERIMENTAL(binding, provider)
          stopEditorSync = startEditorSync()
        }
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      DIFF_VERSIONS_COMMAND__EXPERIMENTAL,
      (snapshots) => {
        if (diffSnapshots === null) {
          stopEditorSync()
        }
        diffSnapshots = snapshots
        renderSnapshot__EXPERIMENTAL(binding, snapshots.snapshot, snapshots.prevSnapshot)
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  )

  const onStatus = ({ status }: { status: string }) => {
    editor.dispatchCommand(CONNECTED_COMMAND, status === 'connected')
  }
  const onSync = (isSynced: boolean) => {
    if (isSynced && shouldBootstrap && binding.root.length === 0) {
      initializeCollaborationEditor(editor)
    }
  }
  const onAwarenessUpdate = () => {
    syncCursorPositions(binding, provider, { selectionHighlight })
  }
  provider.on('status', onStatus)
  provider.on('sync', onSync)
  provider.awareness.on('update', onAwarenessUpdate)

  const rootElement = editor.getRootElement()
  initLocalState(
    provider,
    name,
    color,
    rootElement !== null && getActiveElement(rootElement) === rootElement,
    awarenessData ?? {},
  )

  const connect = () => provider.connect()
  const disconnect = () => {
    try {
      provider.disconnect()
    } catch {
      // A provider may already be disconnected during teardown.
    }
  }
  const connection = connect()
  const unregisterCommands = mergeRegister(
    editor.registerCommand(
      TOGGLE_CONNECT_COMMAND,
      (shouldConnect) => {
        if (shouldConnect) {
          connect()
        } else {
          disconnect()
        }
        return true
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        setLocalStateFocus(provider, name, color, true, awarenessData ?? {})
        return false
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      BLUR_COMMAND,
      () => {
        setLocalStateFocus(provider, name, color, false, awarenessData ?? {})
        return false
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  )
  const unregisterHistory = registerYjsHistory(editor, binding, binding.root)
  const clearAwareness = () => {
    try {
      provider.awareness.setLocalState(null)
    } catch {
      // The provider may already have destroyed its awareness instance.
    }
  }
  window.addEventListener('beforeunload', clearAwareness)
  window.addEventListener('pagehide', clearAwareness)

  return () => {
    disposed = true
    window.removeEventListener('beforeunload', clearAwareness)
    window.removeEventListener('pagehide', clearAwareness)
    clearAwareness()
    unregisterHistory()
    unregisterCommands()
    unregisterDiffCommands()
    stopEditorSync()
    provider.awareness.off('update', onAwarenessUpdate)
    provider.off('status', onStatus)
    provider.off('sync', onSync)
    yjsDocMap.delete(id)
    onBinding(null)

    if (connection instanceof Promise) {
      void connection.then(() => {
        if (disposed) {
          disconnect()
        }
      })
    } else {
      disconnect()
    }
  }
}

export const CollaborationPlugin = defineComponent({
  name: 'LexicalCollaborationPlugin',
  props: {
    id: { type: String, required: true },
    providerFactory: {
      type: Function as PropType<CollaborationProviderFactory>,
      required: true,
    },
    shouldBootstrap: { type: Boolean, required: true },
    username: { type: String, default: undefined },
    cursorColor: { type: String, default: undefined },
    cursorsContainerRef: {
      type: Object as PropType<CursorsContainer>,
      default: undefined,
    },
    initialEditorState: {
      type: [String, Object, Function] as PropType<InitialEditorState>,
      default: undefined,
    },
    excludedProperties: {
      type: Map as PropType<ExcludedProperties>,
      default: undefined,
    },
    awarenessData: { type: Object, default: undefined },
    syncCursorPositionsFn: {
      type: Function as PropType<SyncCursorPositionsFn>,
      default: undefined,
    },
    selectionHighlight: { type: Boolean, default: false },
    rootName: { type: String, default: undefined },
  },
  setup(props) {
    const editor = useLexicalComposer()
    const context = useCollaborationContext(props.username, props.cursorColor)
    const binding = shallowRef<Binding | null>(null)
    let stop: (() => void) | undefined

    onMounted(() => {
      context.isCollabActive = true
      stop = startCollaborationSession({
        ...props,
        color: context.color,
        editor,
        name: context.name,
        onBinding(value) {
          binding.value = value
        },
        yjsDocMap: context.yjsDocMap,
      })
    })

    onUnmounted(() => {
      stop?.()
      if (editor._parentEditor == null) {
        context.isCollabActive = false
      }
    })

    return () => {
      if (binding.value === null || typeof document === 'undefined') {
        return null
      }

      return h(Teleport, { to: getCursorsContainer(props.cursorsContainerRef) }, [
        h('div', {
          ref(element) {
            binding.value!.cursorsContainer = element as HTMLElement | null
          },
        }),
      ])
    }
  },
})

export const CollaborationPluginV2__EXPERIMENTAL = defineComponent({
  name: 'LexicalCollaborationPluginV2__EXPERIMENTAL',
  props: {
    id: { type: String, required: true },
    doc: { type: Object as PropType<Doc>, required: true },
    provider: { type: Object as PropType<Provider>, required: true },
    __shouldBootstrapUnsafe: { type: Boolean, default: false },
    username: { type: String, default: undefined },
    cursorColor: { type: String, default: undefined },
    cursorsContainerRef: {
      type: Object as PropType<CursorsContainer>,
      default: undefined,
    },
    excludedProperties: {
      type: Map as PropType<ExcludedProperties>,
      default: undefined,
    },
    awarenessData: { type: Object, default: undefined },
    selectionHighlight: { type: Boolean, default: false },
    rootName: { type: String, default: undefined },
  },
  setup(props) {
    const editor = useLexicalComposer()
    const context = useCollaborationContext(props.username, props.cursorColor)
    const binding = shallowRef<BindingV2 | null>(null)
    let stop: (() => void) | undefined

    onMounted(() => {
      context.isCollabActive = true
      stop = startCollaborationSessionV2({
        ...props,
        color: context.color,
        doc: toRaw(props.doc),
        editor,
        name: context.name,
        onBinding(value) {
          binding.value = value
        },
        provider: toRaw(props.provider),
        yjsDocMap: context.yjsDocMap,
      })
    })

    onUnmounted(() => {
      stop?.()
      if (editor._parentEditor == null) {
        context.isCollabActive = false
      }
    })

    return () => {
      if (binding.value === null || typeof document === 'undefined') {
        return null
      }

      return h(Teleport, { to: getCursorsContainer(props.cursorsContainerRef) }, [
        h('div', {
          ref(element) {
            binding.value!.cursorsContainer = element as HTMLElement | null
          },
        }),
      ])
    }
  },
})

export { CollaborationPlugin as LexicalCollaborationPlugin }
export default CollaborationPlugin
