import type { ElementNode } from 'lexical'
import {
  AutoLinkNode,
  createLinkMatcherWithRegExp,
  registerAutoLink,
  type ChangeHandler,
  type LinkMatcher,
} from '@lexical/link'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface AutoLinkPluginProps {
  matchers: LinkMatcher[]
  onChange?: ChangeHandler
  excludeParents?: Array<(parent: ElementNode) => boolean>
}

/** Converts matching text to AutoLinkNode instances as the user types. */
export const AutoLinkPlugin = defineComponent({
  name: 'LexicalAutoLinkPlugin',
  props: {
    matchers: {
      type: Array as PropType<LinkMatcher[]>,
      required: true,
    },
    onChange: {
      type: Function as PropType<ChangeHandler>,
      default: undefined,
    },
    excludeParents: {
      type: Array as PropType<Array<(parent: ElementNode) => boolean>>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      if (!editor.hasNodes([AutoLinkNode])) {
        throw new Error('LexicalAutoLinkPlugin: AutoLinkNode not registered on editor')
      }

      stopWatching = watch(
        () => [props.matchers, props.onChange, props.excludeParents] as const,
        ([matchers, onChange, excludeParents], _previous, onCleanup) => {
          onCleanup(
            registerAutoLink(editor, {
              changeHandlers: onChange === undefined ? [] : [onChange],
              excludeParents: excludeParents ?? [],
              matchers,
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

export { createLinkMatcherWithRegExp, registerAutoLink, type ChangeHandler, type LinkMatcher }
export { AutoLinkPlugin as LexicalAutoLinkPlugin }
export default AutoLinkPlugin
