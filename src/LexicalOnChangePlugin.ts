import type { EditorState, LexicalEditor, UpdateTag } from 'lexical'
import { HISTORY_MERGE_TAG } from 'lexical'
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export const OnChangePlugin = defineComponent({
  name: 'LexicalOnChangePlugin',
  props: {
    ignoreHistoryMergeTagChange: {
      type: Boolean,
      default: true,
    },
    ignoreSelectionChange: {
      type: Boolean,
      default: false,
    },
  },
  emits: {
    change: (_editorState: EditorState, _editor: LexicalEditor, _tags: Set<UpdateTag>) => true,
  },
  setup(props, { emit }) {
    const editor = useLexicalComposer()
    let unregister = () => {}

    onMounted(() => {
      unregister = editor.registerUpdateListener(
        ({ dirtyElements, dirtyLeaves, editorState, prevEditorState, tags }) => {
          if (
            (props.ignoreSelectionChange && dirtyElements.size === 0 && dirtyLeaves.size === 0) ||
            (props.ignoreHistoryMergeTagChange && tags.has(HISTORY_MERGE_TAG)) ||
            prevEditorState.isEmpty()
          ) {
            return
          }

          emit('change', editorState, editor, tags)
        },
      )
    })
    onUnmounted(() => unregister())

    return () => null
  },
})

export { OnChangePlugin as LexicalOnChangePlugin }
export default OnChangePlugin
