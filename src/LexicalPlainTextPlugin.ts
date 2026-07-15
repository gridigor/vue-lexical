import { registerDragonSupport } from '@lexical/dragon'
import { registerPlainText } from '@lexical/plain-text'
import { mergeRegister } from 'lexical'
import { Fragment, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useCanShowPlaceholder } from './useCanShowPlaceholder'

export const PlainTextPlugin = defineComponent({
  name: 'LexicalPlainTextPlugin',
  setup(_props, { slots }) {
    const editor = useLexicalComposer()
    const canShowPlaceholder = useCanShowPlaceholder()
    let unregister: (() => void) | undefined

    onMounted(() => {
      unregister = mergeRegister(registerPlainText(editor), registerDragonSupport(editor))
    })
    onUnmounted(() => unregister?.())

    return () =>
      h(Fragment, null, [
        slots.contentEditable?.(),
        canShowPlaceholder.value ? slots.placeholder?.() : null,
      ])
  },
})

export { PlainTextPlugin as LexicalPlainTextPlugin }
export default PlainTextPlugin
