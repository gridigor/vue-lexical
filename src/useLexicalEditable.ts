import type { Ref } from 'vue'
import { useLexicalSubscription } from './useLexicalSubscription'

export function useLexicalEditable(): Readonly<Ref<boolean>> {
  return useLexicalSubscription((editor) => ({
    initialValue: () => editor.isEditable(),
    subscribe: (callback) => editor.registerEditableListener(callback),
  }))
}
