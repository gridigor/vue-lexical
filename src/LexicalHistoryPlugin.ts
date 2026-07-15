import type { HistoryState } from '@lexical/history'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export const HistoryPlugin = defineComponent({
  name: 'LexicalHistoryPlugin',
  props: {
    delay: {
      type: Number,
      default: 300,
    },
    externalHistoryState: {
      type: Object as () => HistoryState,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = registerHistory(
        editor,
        props.externalHistoryState ?? createEmptyHistoryState(),
        props.delay,
      )
    })
    onUnmounted(() => unregister?.())

    return () => null
  },
})

export { createEmptyHistoryState, type HistoryState }
export { HistoryPlugin as LexicalHistoryPlugin }
export default HistoryPlugin
