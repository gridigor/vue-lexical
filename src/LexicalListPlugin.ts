import {
  ListItemNode,
  ListNode,
  registerList,
  registerListStrictIndentTransform,
  type RegisterListOptions,
} from '@lexical/list'
import { mergeRegister } from 'lexical'
import type { WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface ListPluginProps {
  hasStrictIndent?: boolean
  shouldPreserveNumbering?: boolean
}

/** Registers ordered and unordered list commands and shared list transforms. */
export const ListPlugin = defineComponent({
  name: 'LexicalListPlugin',
  props: {
    hasStrictIndent: {
      type: Boolean,
      default: false,
    },
    shouldPreserveNumbering: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      if (!editor.hasNodes([ListNode, ListItemNode])) {
        throw new Error('LexicalListPlugin: ListNode and/or ListItemNode not registered on editor')
      }

      stopWatching = watch(
        () => [props.hasStrictIndent, props.shouldPreserveNumbering] as const,
        ([hasStrictIndent, shouldPreserveNumbering], _previous, onCleanup) => {
          onCleanup(
            mergeRegister(
              registerList(editor, { restoreNumbering: shouldPreserveNumbering }),
              hasStrictIndent ? registerListStrictIndentTransform(editor) : () => {},
            ),
          )
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerList, registerListStrictIndentTransform, type RegisterListOptions }
export { ListPlugin as LexicalListPlugin }
export default ListPlugin
