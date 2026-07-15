import type { AnyLexicalExtensionArgument, LexicalEditorWithDispose } from 'lexical'
import type { PropType } from 'vue'
import { getExtensionDependencyFromEditor, LexicalBuilder } from '@lexical/extension'
import { configExtension } from 'lexical'
import { defineComponent, h, onUnmounted, shallowRef, toRaw, watch } from 'vue'
import { VueExtension, type VueExtensionContentEditable } from './VueExtension'
import { VueProviderExtension } from './VueProviderExtension'

function buildExtensionEditor(
  extension: AnyLexicalExtensionArgument,
  contentEditable: VueExtensionContentEditable | undefined,
): LexicalEditorWithDispose {
  const vueConfig = contentEditable === undefined ? {} : { contentEditable }
  return LexicalBuilder.fromExtensions([
    VueProviderExtension,
    configExtension(VueExtension, vueConfig),
    toRaw(extension),
  ]).buildEditor()
}

export const LexicalExtensionComposer = defineComponent({
  name: 'LexicalExtensionComposer',
  props: {
    contentEditable: {
      type: Function as unknown as PropType<VueExtensionContentEditable>,
      default: undefined,
    },
    extension: {
      type: [Object, Array] as PropType<AnyLexicalExtensionArgument>,
      required: true,
    },
  },
  setup(props, { slots }) {
    const editor = shallowRef(buildExtensionEditor(props.extension, props.contentEditable))

    watch(
      [() => props.extension, () => props.contentEditable] as const,
      ([extension, contentEditable]) => {
        const previousEditor = editor.value
        editor.value = buildExtensionEditor(extension, contentEditable)
        previousEditor.dispose()
      },
      { flush: 'sync' },
    )

    onUnmounted(() => editor.value.dispose())

    return () => {
      const { Component } = getExtensionDependencyFromEditor(editor.value, VueExtension).output
      return h(Component, null, slots)
    }
  },
})

export default LexicalExtensionComposer
