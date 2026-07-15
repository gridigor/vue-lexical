import type { AnyLexicalExtension, LexicalExtensionOutput } from 'lexical'
import type { Component, FunctionalComponent } from 'vue'
import { defineComponent, h, toRaw, useAttrs } from 'vue'
import { useExtensionComponent } from './useExtensionComponent'

type InferComponentProps<ComponentType> = ComponentType extends new (...args: never[]) => {
  $props: infer Props
}
  ? Props
  : ComponentType extends FunctionalComponent<infer Props>
    ? Props
    : Record<string, unknown>

export type ExtensionComponentProps<Extension extends AnyLexicalExtension> = {
  extension: Extension
} & ([LexicalExtensionOutput<Extension>] extends [{ Component: infer Output extends Component }]
  ? Omit<InferComponentProps<Output>, 'extension'>
  : never)

export const ExtensionComponent = defineComponent({
  name: 'ExtensionComponent',
  inheritAttrs: false,
  props: {
    extension: {
      type: Object as () => AnyLexicalExtension,
      required: true,
    },
  },
  setup(props, { slots }) {
    const attrs = useAttrs()
    const Component = useExtensionComponent(toRaw(props.extension))
    return () => h(Component, attrs, slots)
  },
})

export default ExtensionComponent
