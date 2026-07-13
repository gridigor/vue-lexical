import { $insertNodeToNearestRoot } from '@lexical/utils'
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical'
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  $createHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from './LexicalHorizontalRuleNode'

/** Registers INSERT_HORIZONTAL_RULE_COMMAND for the legacy component API. */
export const HorizontalRulePlugin = defineComponent({
  name: 'LexicalHorizontalRulePlugin',
  setup() {
    const editor = useLexicalComposer()
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = editor.registerCommand(
        INSERT_HORIZONTAL_RULE_COMMAND,
        () => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) {
            return false
          }

          $insertNodeToNearestRoot($createHorizontalRuleNode())
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      )
    })
    onUnmounted(() => unregister?.())

    return () => null
  },
})

export { HorizontalRulePlugin as LexicalHorizontalRulePlugin }
export default HorizontalRulePlugin
