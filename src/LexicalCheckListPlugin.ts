import { registerCheckList } from '@lexical/list'
import type { WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface CheckListPluginProps {
  disableTakeFocusOnClick?: boolean
}

/** Registers keyboard and pointer interactions for check-list items. */
export const CheckListPlugin = defineComponent({
  name: 'LexicalCheckListPlugin',
  props: {
    disableTakeFocusOnClick: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => props.disableTakeFocusOnClick,
        (disableTakeFocusOnClick, _previous, onCleanup) => {
          onCleanup(registerCheckList(editor, { disableTakeFocusOnClick }))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerCheckList }
export { CheckListPlugin as LexicalCheckListPlugin }
export default CheckListPlugin
