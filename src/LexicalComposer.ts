import type {
  EditorThemeClasses,
  HTMLConfig,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from 'lexical'
import { createEditor } from 'lexical'
import { Fragment, defineComponent, h, provide } from 'vue'
import { lexicalComposerContextKey, type LexicalComposerContext } from './LexicalComposerContext'
import { LexicalDecorators } from './LexicalDecorators'
import { initializeEditor, type InitialEditorState } from './initializeEditor'

export interface InitialConfig {
  namespace: string
  editable?: boolean
  editorState?: InitialEditorState
  html?: HTMLConfig
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
  onError?: (error: Error, editor: LexicalEditor) => void
  parentEditor?: LexicalEditor
  theme?: EditorThemeClasses
}

export const LexicalComposer = defineComponent({
  name: 'LexicalComposer',
  props: {
    initialConfig: {
      type: Object as () => InitialConfig,
      required: true,
    },
  },
  emits: {
    error: (_error: Error, _editor: LexicalEditor) => true,
  },
  setup(props, { emit, slots }) {
    const config = props.initialConfig
    let editor: LexicalEditor

    editor = createEditor({
      editable: config.editable,
      html: config.html,
      namespace: config.namespace,
      nodes: config.nodes,
      onError(error) {
        emit('error', error, editor)
        if (config.onError !== undefined) {
          config.onError(error, editor)
        } else {
          throw error
        }
      },
      parentEditor: config.parentEditor,
      theme: config.theme,
    })

    initializeEditor(editor, config.editorState)

    const context: LexicalComposerContext = Object.freeze([editor])
    provide(lexicalComposerContextKey, context)

    return () => h(Fragment, null, [slots.default?.(), h(LexicalDecorators)])
  },
})

export default LexicalComposer
