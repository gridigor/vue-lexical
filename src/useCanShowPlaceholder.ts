import type { Ref } from 'vue'
import { $getRoot } from 'lexical'
import { onMounted, onUnmounted, ref } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export function useCanShowPlaceholder(): Readonly<Ref<boolean>> {
  const editor = useLexicalComposer()
  const canShow = ref(false)
  let unregister: (() => void) | undefined

  const update = () => {
    canShow.value = editor
      .getEditorState()
      .read(() => $getRoot().getTextContentSize() === 0 && !editor.isComposing())
  }

  onMounted(() => {
    update()
    unregister = editor.registerUpdateListener(update)
  })
  onUnmounted(() => unregister?.())

  return canShow
}
