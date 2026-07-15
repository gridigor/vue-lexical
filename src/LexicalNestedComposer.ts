import type {
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from 'lexical'
import { createSharedNodeState, getRegisteredNode, getTransformSetFromKlass } from 'lexical'
import { defineComponent, inject, onMounted, onUnmounted, provide } from 'vue'
import { collaborationContextKey } from './LexicalCollaborationContext'
import {
  createLexicalComposerContext,
  lexicalComposerContextKey,
  type LexicalComposerContext,
  useLexicalComposerContext,
} from './LexicalComposerContext'

export interface LexicalNestedComposerProps {
  initialEditor: LexicalEditor
  /** @deprecated Configure nodes when creating initialEditor instead. */
  initialNodes?: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[]
  initialTheme?: EditorThemeClasses
  skipCollabChecks?: true
  skipEditableListener?: boolean
}

let didWarnInitialNodes = false

function warnAboutInitialNodes(): void {
  if (!didWarnInitialNodes) {
    didWarnInitialNodes = true
    console.warn(
      'LexicalNestedComposer: initialNodes is deprecated; configure nodes with createEditor({ nodes, parentEditor }) instead.',
    )
  }
}

function configureNestedEditor(
  editor: LexicalEditor,
  parentEditor: LexicalEditor,
  initialTheme?: EditorThemeClasses,
  initialNodes?: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[],
): void {
  const theme = initialTheme ?? parentEditor._config.theme

  if (theme !== undefined) {
    editor._config.theme = theme
  }

  editor._parentEditor ??= parentEditor

  const createEditorArgs = editor._createEditorArgs
  const hasExplicitNamespace = createEditorArgs?.namespace !== undefined
  const hasExplicitNodes = createEditorArgs?.nodes !== undefined

  if (!hasExplicitNamespace) {
    editor._config.namespace = parentEditor._config.namespace
  }

  if (initialNodes !== undefined) {
    warnAboutInitialNodes()
    for (let node of initialNodes) {
      let replace = null
      let replaceWithKlass = null
      if (typeof node !== 'function') {
        replace = node.with
        replaceWithKlass = node.withKlass ?? null
        node = node.replace
      }
      const registeredNode = getRegisteredNode(editor, node.getType())
      editor._nodes.set(node.getType(), {
        exportDOM: registeredNode?.exportDOM,
        klass: node,
        replace,
        replaceWithKlass,
        sharedNodeState: createSharedNodeState(node),
        transforms: getTransformSetFromKlass(node),
      })
    }
  } else if (!hasExplicitNodes) {
    const inheritedNodes = new Map(parentEditor._nodes)
    editor._nodes = new Map()

    for (const [type, entry] of inheritedNodes) {
      editor._nodes.set(type, {
        exportDOM: entry.exportDOM,
        klass: entry.klass,
        replace: entry.replace,
        replaceWithKlass: entry.replaceWithKlass,
        sharedNodeState: createSharedNodeState(entry.klass),
        transforms: getTransformSetFromKlass(entry.klass),
      })
    }
  }
}

export const LexicalNestedComposer = defineComponent({
  name: 'LexicalNestedComposer',
  props: {
    initialEditor: {
      type: Object as () => LexicalEditor,
      required: true,
    },
    initialTheme: {
      type: Object as () => EditorThemeClasses,
      default: undefined,
    },
    initialNodes: {
      type: Array as unknown as () => readonly (Klass<LexicalNode> | LexicalNodeReplacement)[],
      default: undefined,
    },
    skipCollabChecks: {
      type: Boolean as unknown as () => true | undefined,
      default: undefined,
    },
    skipEditableListener: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    const parentContext = useLexicalComposerContext()
    const parentEditor = parentContext[0]
    const editor = props.initialEditor
    const collaborationContext = inject(collaborationContextKey, null)
    let wasCollaborationReady = false

    configureNestedEditor(editor, parentEditor, props.initialTheme, props.initialNodes)

    const theme = props.initialTheme ?? parentContext[1].getTheme()
    const context: LexicalComposerContext = [
      editor,
      createLexicalComposerContext(parentContext, theme),
    ]
    provide(lexicalComposerContextKey, context)

    let unregisterEditableListener = () => {}

    onMounted(() => {
      if (props.skipEditableListener) {
        return
      }

      const updateEditable = (editable: boolean) => editor.setEditable(editable)
      updateEditable(parentEditor.isEditable())
      unregisterEditableListener = parentEditor.registerEditableListener(updateEditable)
    })

    onUnmounted(() => unregisterEditableListener())

    return () => {
      const isCollaborationReady =
        props.skipCollabChecks === true ||
        wasCollaborationReady ||
        collaborationContext?.yjsDocMap.has(editor.getKey()) === true

      if (isCollaborationReady) {
        wasCollaborationReady = true
      }

      const shouldRender = collaborationContext?.isCollabActive !== true || isCollaborationReady
      return shouldRender ? slots.default?.() : null
    }
  },
})

export default LexicalNestedComposer
