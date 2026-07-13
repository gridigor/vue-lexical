import { selectionAlwaysOnDisplay } from '@lexical/utils'
import type { PropType } from 'vue'
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export type SelectionRepositionHandler = (nodes: readonly HTMLElement[]) => void

/** Keeps a DOM highlight visible while focus is outside the editor. */
export const SelectionAlwaysOnDisplay = defineComponent({
  name: 'LexicalSelectionAlwaysOnDisplay',
  props: {
    onReposition: {
      type: Function as PropType<SelectionRepositionHandler>,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = selectionAlwaysOnDisplay(editor, (nodes) => props.onReposition?.(nodes))
    })
    onUnmounted(() => unregister?.())

    return () => null
  },
})

export { SelectionAlwaysOnDisplay as LexicalSelectionAlwaysOnDisplay }
export default SelectionAlwaysOnDisplay
