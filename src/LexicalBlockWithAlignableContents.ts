import { $getNearestBlockElementAncestorOrThrow } from '@lexical/utils'
import type { ElementFormatType, NodeKey } from 'lexical'
import type { PropType } from 'vue'
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  getComposedEventTarget,
  mergeRegister,
} from 'lexical'
import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { $isDecoratorBlockNode } from './LexicalDecoratorBlockNode'
import { useLexicalNodeSelection } from './useLexicalNodeSelection'

export interface BlockWithAlignableContentsClassName {
  base: string
  focus: string
}

export interface BlockWithAlignableContentsProps {
  nodeKey: NodeKey
  format?: ElementFormatType | null
  className: Readonly<BlockWithAlignableContentsClassName>
}

/** Wraps a decorator block with selection and alignment behavior. */
export const BlockWithAlignableContents = defineComponent({
  name: 'LexicalBlockWithAlignableContents',
  props: {
    nodeKey: {
      type: String as PropType<NodeKey>,
      required: true,
    },
    format: {
      type: String as PropType<ElementFormatType | null>,
      default: null,
    },
    className: {
      type: Object as PropType<Readonly<BlockWithAlignableContentsClassName>>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const editor = useLexicalComposer()
    const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(props.nodeKey)
    const element = ref<HTMLElement | null>(null)
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = mergeRegister(
        editor.registerCommand(
          FORMAT_ELEMENT_COMMAND,
          (formatType) => {
            if (!isSelected.value) {
              return false
            }

            const selection = $getSelection()
            if ($isNodeSelection(selection)) {
              const node = $getNodeByKey(props.nodeKey)
              if ($isDecoratorBlockNode(node)) {
                node.setFormat(formatType)
              }
            } else if ($isRangeSelection(selection)) {
              for (const node of selection.getNodes()) {
                if ($isDecoratorBlockNode(node)) {
                  node.setFormat(formatType)
                } else {
                  $getNearestBlockElementAncestorOrThrow(node).setFormat(formatType)
                }
              }
            }

            return true
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          CLICK_COMMAND,
          (event) => {
            if (getComposedEventTarget(event) !== element.value) {
              return false
            }

            event.preventDefault()
            if (!event.shiftKey) {
              clearSelection()
            }
            setSelected(!isSelected.value)
            return true
          },
          COMMAND_PRIORITY_LOW,
        ),
      )
    })
    onUnmounted(() => unregister?.())

    return () =>
      h(
        'div',
        {
          class: [props.className.base, isSelected.value && props.className.focus],
          ref: element,
          style: props.format ? { textAlign: props.format } : undefined,
        },
        slots.default?.(),
      )
  },
})

export { BlockWithAlignableContents as LexicalBlockWithAlignableContents }
export default BlockWithAlignableContents
