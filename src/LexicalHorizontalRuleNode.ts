import {
  $isHorizontalRuleNode,
  HorizontalRuleNode as BaseHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
  type SerializedHorizontalRuleNode,
} from '@lexical/extension'
import type { DOMConversionMap, DOMConversionOutput, NodeKey } from 'lexical'
import type { VNodeChild } from 'vue'
import {
  $applyNodeReplacement,
  addClassNamesToElement,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  getComposedEventTarget,
  removeClassNamesFromElement,
} from 'lexical'
import { defineComponent, h, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useLexicalNodeSelection } from './useLexicalNodeSelection'

export { $isHorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND }
export type { SerializedHorizontalRuleNode }

const HorizontalRuleComponent = defineComponent({
  name: 'LexicalHorizontalRuleComponent',
  props: {
    nodeKey: {
      type: String as () => NodeKey,
      required: true,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(props.nodeKey)
    const selectedClassName = editor._config.theme.hrSelected ?? 'selected'
    let selectedElement: HTMLElement | null = null
    let unregisterClick: (() => void) | undefined
    let stopWatching: (() => void) | undefined

    const updateSelectedClass = (selected: boolean) => {
      const element = editor.getElementByKey(props.nodeKey)
      if (element !== null) {
        selectedElement = element
        if (selected) {
          addClassNamesToElement(element, selectedClassName)
        } else {
          removeClassNamesFromElement(element, selectedClassName)
        }
      }
    }

    onMounted(() => {
      unregisterClick = editor.registerCommand(
        CLICK_COMMAND,
        (event) => {
          if (getComposedEventTarget(event) !== editor.getElementByKey(props.nodeKey)) {
            return false
          }

          if (!event.shiftKey) {
            clearSelection()
          }
          setSelected(!isSelected.value)
          return true
        },
        COMMAND_PRIORITY_LOW,
      )
      stopWatching = watch(isSelected, updateSelectedClass, { immediate: true })
    })
    onUnmounted(() => {
      unregisterClick?.()
      stopWatching?.()
      if (selectedElement !== null) {
        removeClassNamesFromElement(selectedElement, selectedClassName)
      }
    })

    return () => null
  },
})

/** Horizontal rule node with Vue-powered node-selection styling. */
export class HorizontalRuleNode extends BaseHorizontalRuleNode {
  static getType(): string {
    return 'horizontalrule'
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.getKey())
  }

  static importJSON(serializedNode: SerializedHorizontalRuleNode): HorizontalRuleNode {
    return $createHorizontalRuleNode().updateFromJSON(serializedNode)
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: () => ({
        conversion: $convertHorizontalRuleElement,
        priority: 0,
      }),
    }
  }

  decorate(): VNodeChild {
    return h(HorizontalRuleComponent, { nodeKey: this.getKey() })
  }
}

function $convertHorizontalRuleElement(): DOMConversionOutput {
  return { node: $createHorizontalRuleNode() }
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return $applyNodeReplacement(new HorizontalRuleNode())
}
