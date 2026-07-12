import type { LexicalNode } from 'lexical'
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from '@lexical/extension'
import {
  registerMarkdownShortcuts,
  TRANSFORMERS,
  type ElementTransformer,
  type Transformer,
} from '@lexical/markdown'
import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

const HORIZONTAL_RULE: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node: LexicalNode) => ($isHorizontalRuleNode(node) ? '***' : null),
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const line = $createHorizontalRuleNode()

    if (isImport || parentNode.getNextSibling() !== null) {
      parentNode.replace(line)
    } else {
      parentNode.insertBefore(line)
    }

    line.selectNext()
  },
  triggerOnEnter: true,
  type: 'element',
}

/** The standard Markdown transformers plus the horizontal-rule shortcut. */
export const DEFAULT_TRANSFORMERS: Transformer[] = [HORIZONTAL_RULE, ...TRANSFORMERS]

export interface MarkdownShortcutPluginProps {
  transformers?: Transformer[]
}

/** Converts Markdown syntax to Lexical nodes as the user types. */
export const MarkdownShortcutPlugin = defineComponent({
  name: 'LexicalMarkdownShortcutPlugin',
  props: {
    transformers: {
      type: Array as PropType<Transformer[]>,
      default: () => DEFAULT_TRANSFORMERS,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => props.transformers,
        (transformers, _previous, onCleanup) => {
          onCleanup(registerMarkdownShortcuts(editor, transformers))
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => null
  },
})

export { registerMarkdownShortcuts, type ElementTransformer, type Transformer }
export { MarkdownShortcutPlugin as LexicalMarkdownShortcutPlugin }
export default MarkdownShortcutPlugin
