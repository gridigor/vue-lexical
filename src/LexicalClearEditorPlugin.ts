import { registerClearEditor } from '@lexical/extension'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export const ClearEditorPlugin = defineComponent({
  name: 'LexicalClearEditorPlugin',
  props: {
    onClear: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => props.onClear,
        (onClear, _previousOnClear, onCleanup) => {
          onCleanup(registerClearEditor(editor, onClear))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { ClearEditorPlugin as LexicalClearEditorPlugin }
export default ClearEditorPlugin
