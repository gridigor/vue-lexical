import { namedSignals } from '@lexical/extension'
import { registerClickableLink } from '@lexical/link'
import type { WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface ClickableLinkPluginProps {
  newTab?: boolean
  disabled?: boolean
}

/** Opens links when clicked, including while the editor is read-only. */
export const ClickableLinkPlugin = defineComponent({
  name: 'LexicalClickableLinkPlugin',
  props: {
    newTab: {
      type: Boolean,
      default: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => [props.newTab, props.disabled] as const,
        ([newTab, disabled], _previous, onCleanup) => {
          onCleanup(registerClickableLink(editor, namedSignals({ disabled, newTab })))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerClickableLink }
export { ClickableLinkPlugin as LexicalClickableLinkPlugin }
export default ClickableLinkPlugin
