import type { LexicalEditor, NodeKey } from 'lexical'
import { isHTMLElement, mountSlotContainer, unmountSlotContainer } from 'lexical'
import { onScopeDispose } from 'vue'
import type { LexicalElementRef } from './useLexicalExtensionElementRef'

export function useLexicalSlotRef(
  editor: LexicalEditor,
  nodeKey: NodeKey,
  slotName: string,
): LexicalElementRef {
  let dispose: (() => void) | undefined

  const clear = () => {
    dispose?.()
    dispose = undefined
  }

  onScopeDispose(clear)

  return (target) => {
    clear()
    if (isHTMLElement(target)) {
      const container = mountSlotContainer(editor, nodeKey, slotName, target)
      if (container !== null) {
        dispose = () => unmountSlotContainer(editor, nodeKey, container)
      }
    }
  }
}
