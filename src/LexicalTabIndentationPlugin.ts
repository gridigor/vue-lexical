import { registerTabIndentation, type CanIndentPredicate } from '@lexical/extension'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface TabIndentationPluginProps {
  maxIndent?: number
  canIndent?: CanIndentPredicate
}

/**
 * Handles Tab and Shift+Tab as indent and outdent commands. This can trap
 * keyboard focus inside the editor, so applications should enable it only
 * when that behavior is intentional.
 */
export const TabIndentationPlugin = defineComponent({
  name: 'LexicalTabIndentationPlugin',
  props: {
    maxIndent: {
      type: Number,
      default: undefined,
    },
    canIndent: {
      type: Function as PropType<CanIndentPredicate>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => [props.maxIndent, props.canIndent] as const,
        ([maxIndent, canIndent], _previous, onCleanup) => {
          onCleanup(registerTabIndentation(editor, maxIndent, canIndent))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerTabIndentation, type CanIndentPredicate }
export { TabIndentationPlugin as LexicalTabIndentationPlugin }
export default TabIndentationPlugin
