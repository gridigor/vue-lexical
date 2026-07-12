import { $trimTextContentFromAnchor } from '@lexical/selection'
import { $restoreEditorState } from '@lexical/utils'
import { $getSelection, $isRangeSelection, RootNode, type EditorState } from 'lexical'
import type { WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export const MaxLengthPlugin = defineComponent({
  name: 'LexicalMaxLengthPlugin',
  props: {
    maxLength: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => props.maxLength,
        (maxLength, _previous, onCleanup) => {
          let lastRestoredEditorState: EditorState | null = null
          onCleanup(
            editor.registerNodeTransform(RootNode, (rootNode) => {
              const selection = $getSelection()
              if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
                return
              }

              const previousEditorState = editor.getEditorState()
              const previousSize = previousEditorState.read(() => rootNode.getTextContentSize())
              const currentSize = rootNode.getTextContentSize()
              if (previousSize === currentSize) {
                return
              }

              const deleteCount = currentSize - maxLength
              if (deleteCount <= 0) {
                return
              }

              if (previousSize === maxLength && lastRestoredEditorState !== previousEditorState) {
                lastRestoredEditorState = previousEditorState
                $restoreEditorState(editor, previousEditorState)
              } else {
                $trimTextContentFromAnchor(editor, selection.anchor, deleteCount)
              }
            }),
          )
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { MaxLengthPlugin as LexicalMaxLengthPlugin }
export default MaxLengthPlugin
