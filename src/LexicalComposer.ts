import type {
  EditorThemeClasses,
  HTMLConfig,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from 'lexical'
import { createEditor } from 'lexical'
import { defineComponent, provide } from 'vue'
import {
  createLexicalComposerContext,
  lexicalComposerContextKey,
  type LexicalComposerContext,
} from './LexicalComposerContext'
import { initializeEditor, type InitialEditorStateType } from './initializeEditor'

export type InitialConfigType = Readonly<{
  namespace: string
  editable?: boolean
  editorState?: InitialEditorStateType
  html?: HTMLConfig
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>
  onError?: (error: Error, editor: LexicalEditor) => void
  onWarn?: (error: Error, editor: LexicalEditor) => void
  parentEditor?: LexicalEditor
  theme?: EditorThemeClasses
}>

export type InitialConfig = InitialConfigType
export type { InitialEditorState, InitialEditorStateType } from './initializeEditor'

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
    const onWarn = config.onWarn
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
      ...(onWarn === undefined
        ? {}
        : {
            onWarn(error: Error) {
              onWarn(error, editor)
            },
          }),
      parentEditor: config.parentEditor,
      theme: config.theme,
    })

    initializeEditor(editor, config.editorState)

    const context: LexicalComposerContext = [
      editor,
      createLexicalComposerContext(null, config.theme),
    ]
    provide(lexicalComposerContextKey, context)

    return () => slots.default?.()
  },
})

export default LexicalComposer
