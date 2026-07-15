import { registerDragonSupport } from '@lexical/dragon'
import { registerPlainText } from '@lexical/plain-text'
import { mergeRegister } from 'lexical'
import type { Component, PropType } from 'vue'
import { Fragment, defineComponent, h, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { LexicalDecorators } from './LexicalDecorators'
import { LexicalErrorBoundary } from './LexicalErrorBoundary'
import { useCanShowPlaceholder } from './useCanShowPlaceholder'

export interface PlainTextPluginProps {
  errorBoundary?: Component
}

export const PlainTextPlugin = defineComponent({
  name: 'LexicalPlainTextPlugin',
  props: {
    errorBoundary: {
      type: [Object, Function] as PropType<Component>,
      default: () => LexicalErrorBoundary,
    },
  },
  setup(props, { slots }) {
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
        h(
          props.errorBoundary,
          {
            onError(error: Error) {
              editor._onError(error)
            },
          },
          { default: () => h(LexicalDecorators) },
        ),
      ])
  },
})

export { PlainTextPlugin as LexicalPlainTextPlugin }
export default PlainTextPlugin
