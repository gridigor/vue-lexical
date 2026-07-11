import type { PropType } from 'vue'
import {
  Fragment,
  defineComponent,
  h,
  mergeProps,
  onMounted,
  onUnmounted,
  ref,
  useAttrs,
} from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useCanShowPlaceholder } from './useCanShowPlaceholder'

export const ContentEditable = defineComponent({
  name: 'LexicalContentEditable',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<keyof HTMLElementTagNameMap>,
      default: 'div',
    },
  },
  setup(props, { slots }) {
    const attrs = useAttrs()
    const editor = useLexicalComposer()
    const rootElement = ref<HTMLElement | null>(null)
    const editable = ref(editor.isEditable())
    const canShowPlaceholder = useCanShowPlaceholder()
    let unregisterEditable = () => {}

    onMounted(() => {
      editor.setRootElement(rootElement.value)
      unregisterEditable = editor.registerEditableListener((nextEditable) => {
        editable.value = nextEditable
      })
    })

    onUnmounted(() => {
      unregisterEditable()
      if (editor.getRootElement() === rootElement.value) {
        editor.setRootElement(null)
      }
    })

    return () =>
      h(Fragment, null, [
        h(
          props.as,
          mergeProps(attrs, {
            'aria-readonly': !editable.value,
            contenteditable: editable.value ? 'true' : 'false',
            ref: rootElement,
            role: attrs.role ?? 'textbox',
            spellcheck: attrs.spellcheck ?? true,
          }),
        ),
        canShowPlaceholder.value && slots.placeholder
          ? h(
              'div',
              { 'aria-hidden': 'true', class: 'lexical-placeholder' },
              slots.placeholder(),
            )
          : null,
      ])
  },
})

export { ContentEditable as LexicalContentEditable }
export default ContentEditable
