import { defineComponent, onMounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export const AutoFocusPlugin = defineComponent({
  name: 'LexicalAutoFocusPlugin',
  props: {
    defaultSelection: {
      type: String as () => 'rootStart' | 'rootEnd',
      default: 'rootEnd',
    },
  },
  setup(props) {
    const editor = useLexicalComposer()

    onMounted(() => {
      editor.focus(undefined, { defaultSelection: props.defaultSelection })
    })

    return () => null
  },
})

export { AutoFocusPlugin as LexicalAutoFocusPlugin }
export default AutoFocusPlugin
