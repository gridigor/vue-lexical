import { namedSignals } from '@lexical/extension'
import { LinkNode, registerLink, type LinkAttributes } from '@lexical/link'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface LinkPluginProps {
  validateUrl?: (url: string) => boolean
  attributes?: LinkAttributes
}

/** Registers link commands and normalization for editors containing LinkNode. */
export const LinkPlugin = defineComponent({
  name: 'LexicalLinkPlugin',
  props: {
    validateUrl: {
      type: Function as PropType<(url: string) => boolean>,
      default: undefined,
    },
    attributes: {
      type: Object as PropType<LinkAttributes>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      if (!editor.hasNodes([LinkNode])) {
        throw new Error('LexicalLinkPlugin: LinkNode not registered on editor')
      }

      stopWatching = watch(
        () => [props.validateUrl, props.attributes] as const,
        ([validateUrl, attributes], _previous, onCleanup) => {
          onCleanup(registerLink(editor, namedSignals({ attributes, validateUrl })))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerLink, type LinkAttributes }
export { LinkPlugin as LexicalLinkPlugin }
export default LinkPlugin
