import { registerDragonSupport } from '@lexical/dragon'
import { registerRichText } from '@lexical/rich-text'
import { mergeRegister } from 'lexical'
import { Fragment, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useCanShowPlaceholder } from './useCanShowPlaceholder'

export const RichTextPlugin = defineComponent({
  name: 'LexicalRichTextPlugin',
  setup(_props, { slots }) {
    const editor = useLexicalComposer()
    const canShowPlaceholder = useCanShowPlaceholder()
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = mergeRegister(registerRichText(editor), registerDragonSupport(editor))
    })
    onUnmounted(() => unregister?.())

    return () =>
      h(Fragment, null, [
        slots.contentEditable?.(),
        canShowPlaceholder.value ? slots.placeholder?.() : null,
      ])
  },
})

export { RichTextPlugin as LexicalRichTextPlugin }
export default RichTextPlugin
