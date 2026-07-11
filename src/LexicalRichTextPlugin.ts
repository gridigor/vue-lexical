import { registerRichText } from '@lexical/rich-text'
import { Fragment, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useCanShowPlaceholder } from './useCanShowPlaceholder'

export const RichTextPlugin = defineComponent({
  name: 'LexicalRichTextPlugin',
  setup(_props, { slots }) {
    const editor = useLexicalComposer()
    const canShowPlaceholder = useCanShowPlaceholder()
    let unregister = () => {}

    onMounted(() => {
      unregister = registerRichText(editor)
    })
    onUnmounted(() => unregister())

    return () =>
      h(Fragment, null, [
        slots.contentEditable?.(),
        canShowPlaceholder.value ? slots.placeholder?.() : null,
      ])
  },
})

export { RichTextPlugin as LexicalRichTextPlugin }
export default RichTextPlugin
