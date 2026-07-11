import type { EditorThemeClasses, LexicalEditor } from 'lexical'
import { createSharedNodeState, getTransformSetFromKlass } from 'lexical'
import { Fragment, defineComponent, h, onMounted, onUnmounted, provide } from 'vue'
import {
  lexicalComposerContextKey,
  type LexicalComposerContext,
  useLexicalComposer,
} from './LexicalComposerContext'
import { LexicalDecorators } from './LexicalDecorators'

export interface LexicalNestedComposerProps {
  initialEditor: LexicalEditor
  initialTheme?: EditorThemeClasses
  skipEditableListener?: boolean
}

function configureNestedEditor(
  editor: LexicalEditor,
  parentEditor: LexicalEditor,
  initialTheme?: EditorThemeClasses,
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

  if (!hasExplicitNodes) {
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
    skipEditableListener: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    const parentEditor = useLexicalComposer()
    const editor = props.initialEditor

    configureNestedEditor(editor, parentEditor, props.initialTheme)

    const context: LexicalComposerContext = Object.freeze([editor])
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

    return () => h(Fragment, null, [slots.default?.(), h(LexicalDecorators)])
  },
})

export default LexicalNestedComposer
