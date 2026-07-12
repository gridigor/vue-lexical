import type { LexicalEditor } from 'lexical'
import type { PropType, Ref } from 'vue'
import { defineComponent, isRef, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export type LexicalEditorRef =
  | Ref<LexicalEditor | null | undefined>
  | ((editor: LexicalEditor | null) => void)

function setEditorRef(editorRef: LexicalEditorRef, editor: LexicalEditor | null): void {
  if (typeof editorRef === 'function') {
    editorRef(editor)
  } else if (isRef(editorRef)) {
    editorRef.value = editor
  }
}

export const EditorRefPlugin = defineComponent({
  name: 'LexicalEditorRefPlugin',
  props: {
    editorRef: {
      type: [Function, Object] as PropType<LexicalEditorRef>,
      required: true,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()

    onMounted(() => setEditorRef(props.editorRef, editor))
    onUnmounted(() => setEditorRef(props.editorRef, null))

    return () => null
  },
})

export { EditorRefPlugin as LexicalEditorRefPlugin }
export default EditorRefPlugin
