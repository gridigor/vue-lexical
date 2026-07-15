import type { LexicalEditorWithDispose } from 'lexical'
import type { PropType } from 'vue'
import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { defineComponent, h, toRaw } from 'vue'
import { VueExtension } from './VueExtension'

export const LexicalExtensionEditorComposer = defineComponent({
  name: 'LexicalExtensionEditorComposer',
  props: {
    initialEditor: {
      type: Object as PropType<LexicalEditorWithDispose>,
      required: true,
    },
  },
  setup(props, { slots }) {
    return () => {
      const { Component } = getExtensionDependencyFromEditor(
        toRaw(props.initialEditor),
        VueExtension,
      ).output
      return h(Component, null, slots)
    }
  },
})

export default LexicalExtensionEditorComposer
