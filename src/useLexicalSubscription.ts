import type { LexicalEditor } from 'lexical'
import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface LexicalSubscription<T> {
  initialValue: () => T
  subscribe: (callback: (value: T) => void) => () => void
}

export function useLexicalSubscription<T>(
  createSubscription: (editor: LexicalEditor) => LexicalSubscription<T>,
): Readonly<Ref<T>> {
  const editor = useLexicalComposer()
  const subscription = createSubscription(editor)
  const value = ref(subscription.initialValue()) as Ref<T>
  let unsubscribe = () => {}

  onMounted(() => {
    value.value = subscription.initialValue()
    unsubscribe = subscription.subscribe((nextValue) => {
      value.value = nextValue
    })
  })
  onUnmounted(() => unsubscribe())

  return value
}
