import type { NodeKey } from 'lexical'
import type { VNodeChild } from 'vue'
import { Teleport, defineComponent, h, onMounted, onUnmounted, shallowRef } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export type VueDecorator = VNodeChild

export const LexicalDecorators = defineComponent({
  name: 'LexicalDecorators',
  setup() {
    const editor = useLexicalComposer()
    const decorators = shallowRef(editor.getDecorators<VueDecorator>())
    const rootElement = shallowRef(editor.getRootElement())
    let unregisterDecorators: (() => void) | undefined
    let unregisterRoot: (() => void) | undefined

    onMounted(() => {
      unregisterDecorators = editor.registerDecoratorListener<VueDecorator>((nextDecorators) => {
        decorators.value = nextDecorators
      })
      unregisterRoot = editor.registerRootListener((nextRootElement) => {
        rootElement.value = nextRootElement
      })

      // The root element may have mounted before this component subscribed.
      decorators.value = editor.getDecorators<VueDecorator>()
    })

    onUnmounted(() => {
      unregisterDecorators?.()
      unregisterRoot?.()
    })

    return () => {
      // Root changes can replace every DecoratorNode host without changing
      // the decorators record, so make the current host mapping reactive too.
      if (rootElement.value === null) {
        return null
      }

      return Object.entries(decorators.value).map(([nodeKey, decorator]) => {
        const element = editor.getElementByKey(nodeKey as NodeKey)

        return element === null ? null : h(Teleport, { key: nodeKey, to: element }, [decorator])
      })
    }
  },
})

export default LexicalDecorators
