import type { LexicalEditor } from 'lexical'
import type { AriaAttributes, HTMLAttributes, PropType } from 'vue'
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
import { useLexicalEditable } from './useLexicalEditable'

interface ContentEditableAriaCompatibilityProps {
  ariaActiveDescendant?: AriaAttributes['aria-activedescendant']
  ariaAutoComplete?: AriaAttributes['aria-autocomplete']
  ariaControls?: AriaAttributes['aria-controls']
  ariaDescribedBy?: AriaAttributes['aria-describedby']
  ariaErrorMessage?: AriaAttributes['aria-errormessage']
  ariaExpanded?: AriaAttributes['aria-expanded']
  ariaInvalid?: AriaAttributes['aria-invalid']
  ariaLabel?: AriaAttributes['aria-label']
  ariaLabelledBy?: AriaAttributes['aria-labelledby']
  ariaMultiline?: AriaAttributes['aria-multiline']
  ariaOwns?: AriaAttributes['aria-owns']
  ariaRequired?: AriaAttributes['aria-required']
}

export type ContentEditableElementProps = Omit<HTMLAttributes, 'contenteditable'> &
  ContentEditableAriaCompatibilityProps & {
    editor: LexicalEditor
    as?: keyof HTMLElementTagNameMap
  }

export type ContentEditableProps = Omit<ContentEditableElementProps, 'editor'>

const sharedProps = {
  as: {
    type: String as PropType<keyof HTMLElementTagNameMap>,
    default: 'div',
  },
  ariaActiveDescendant: String,
  ariaAutoComplete: String,
  ariaControls: String,
  ariaDescribedBy: String,
  ariaErrorMessage: String,
  ariaExpanded: [Boolean, String],
  ariaInvalid: [Boolean, String],
  ariaLabel: String,
  ariaLabelledBy: String,
  ariaMultiline: [Boolean, String],
  ariaOwns: String,
  ariaRequired: [Boolean, String],
}

function preferredAriaAttribute(
  attrs: Record<string, unknown>,
  name: string,
  compatibilityValue: unknown,
): unknown {
  return attrs[name] ?? compatibilityValue
}

function expandedAriaAttribute(value: unknown): boolean {
  return value === 'false' ? false : Boolean(value)
}

/** Lower-level editable surface that binds an explicitly supplied editor. */
export const ContentEditableElement = defineComponent({
  name: 'LexicalContentEditableElement',
  inheritAttrs: false,
  props: {
    ...sharedProps,
    editor: {
      type: Object as PropType<LexicalEditor>,
      required: true,
    },
  },
  setup(props) {
    const attrs = useAttrs()
    const editor = props.editor
    const rootElement = ref<HTMLElement | null>(null)
    const editable = ref(editor.isEditable())
    let unregisterEditable: (() => void) | undefined
    let mountedRootElement: HTMLElement | null = null

    onMounted(() => {
      editable.value = editor.isEditable()
      const element = rootElement.value
      mountedRootElement = element?.ownerDocument.defaultView ? element : null
      editor.setRootElement(mountedRootElement)
      unregisterEditable = editor.registerEditableListener((nextEditable) => {
        editable.value = nextEditable
      })
    })

    onUnmounted(() => {
      unregisterEditable?.()
      if (editor.getRootElement() === mountedRootElement) {
        editor.setRootElement(null)
      }
      mountedRootElement = null
    })

    return () => {
      const isEditable = editable.value
      const role = attrs.role ?? 'textbox'
      const expandedAttribute = attrs['aria-expanded']

      return h(
        props.as,
        mergeProps(attrs, {
          'aria-activedescendant': isEditable
            ? preferredAriaAttribute(attrs, 'aria-activedescendant', props.ariaActiveDescendant)
            : undefined,
          'aria-autocomplete': isEditable
            ? preferredAriaAttribute(attrs, 'aria-autocomplete', props.ariaAutoComplete)
            : 'none',
          'aria-controls': isEditable
            ? preferredAriaAttribute(attrs, 'aria-controls', props.ariaControls)
            : undefined,
          'aria-describedby': preferredAriaAttribute(
            attrs,
            'aria-describedby',
            props.ariaDescribedBy,
          ),
          'aria-errormessage': preferredAriaAttribute(
            attrs,
            'aria-errormessage',
            props.ariaErrorMessage,
          ),
          'aria-expanded':
            isEditable && role === 'combobox'
              ? expandedAriaAttribute(expandedAttribute ?? props.ariaExpanded)
              : undefined,
          'aria-invalid': preferredAriaAttribute(attrs, 'aria-invalid', props.ariaInvalid),
          'aria-label': preferredAriaAttribute(attrs, 'aria-label', props.ariaLabel),
          'aria-labelledby': preferredAriaAttribute(attrs, 'aria-labelledby', props.ariaLabelledBy),
          'aria-multiline': preferredAriaAttribute(attrs, 'aria-multiline', props.ariaMultiline),
          'aria-owns': isEditable
            ? preferredAriaAttribute(attrs, 'aria-owns', props.ariaOwns)
            : undefined,
          'aria-readonly': isEditable ? undefined : true,
          'aria-required': preferredAriaAttribute(attrs, 'aria-required', props.ariaRequired),
          contenteditable: isEditable ? 'true' : 'false',
          ref: rootElement,
          role,
          spellcheck: attrs.spellcheck ?? true,
        }),
      )
    }
  },
})

/** Editable surface that reads its editor from the nearest LexicalComposer. */
export const ContentEditable = defineComponent({
  name: 'LexicalContentEditable',
  inheritAttrs: false,
  props: sharedProps,
  setup(props, { slots }) {
    const attrs = useAttrs()
    const editor = useLexicalComposer()
    const editable = useLexicalEditable()
    const canShowPlaceholder = useCanShowPlaceholder()

    return () =>
      h(Fragment, null, [
        h(ContentEditableElement, { ...attrs, ...props, editor } as ContentEditableElementProps),
        canShowPlaceholder.value && slots.placeholder
          ? h(
              'div',
              { 'aria-hidden': 'true', class: 'lexical-placeholder' },
              slots.placeholder({ isEditable: editable.value }),
            )
          : null,
      ])
  },
})

export { ContentEditable as LexicalContentEditable }
export default ContentEditable
