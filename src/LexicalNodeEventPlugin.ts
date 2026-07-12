import {
  $findMatchingParent,
  $getNearestNodeFromDOMNode,
  registerEventListener,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

const capturedEvents = new Set(['mouseenter', 'mouseleave'])

export type NodeEventListener = (event: Event, editor: LexicalEditor, nodeKey: NodeKey) => void

export interface NodeEventPluginProps {
  nodeType: Klass<LexicalNode>
  eventType: string
  eventListener: NodeEventListener
}

/**
 * Delegates a DOM event from the editor root to matching Lexical nodes.
 * Mouse enter and leave use capture semantics and only match the nearest node.
 */
export const NodeEventPlugin = defineComponent({
  name: 'LexicalNodeEventPlugin',
  props: {
    nodeType: {
      type: Function as unknown as PropType<Klass<LexicalNode>>,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    eventListener: {
      type: Function as PropType<NodeEventListener>,
      required: true,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => props.nodeType,
        (nodeType, _previous, onCleanup) => {
          const eventType = props.eventType
          const isCaptured = capturedEvents.has(eventType)

          const onEvent = (event: Event) => {
            editor.update(() => {
              const nearestNode = $getNearestNodeFromDOMNode(event.target as Element)
              if (nearestNode !== null) {
                const targetNode = isCaptured
                  ? nearestNode instanceof nodeType
                    ? nearestNode
                    : null
                  : $findMatchingParent(nearestNode, (node) => node instanceof nodeType)

                if (targetNode !== null) {
                  props.eventListener(event, editor, targetNode.getKey())
                }
              }
            })
          }

          onCleanup(
            editor.registerRootListener((rootElement) => {
              if (rootElement !== null) {
                return registerEventListener(rootElement, eventType, onEvent, isCaptured)
              }
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

export { NodeEventPlugin as LexicalNodeEventPlugin }
export default NodeEventPlugin
