import { $isRootTextContentEmptyCurry } from '@lexical/text'
import type { LexicalEditor } from 'lexical'
import type { Ref } from 'vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export function useLexicalIsTextContentEmpty(
  editor: LexicalEditor = useLexicalComposer(),
  trim?: boolean,
): Readonly<Ref<boolean>> {
  const readIsEmpty = () =>
    editor.read('latest', $isRootTextContentEmptyCurry(editor.isComposing(), trim))
  const isEmpty = ref(readIsEmpty())
  let unregister = () => {}

  onMounted(() => {
    isEmpty.value = readIsEmpty()
    unregister = editor.registerUpdateListener(({ editorState }) => {
      isEmpty.value = editorState.read($isRootTextContentEmptyCurry(editor.isComposing(), trim))
    })
  })
  onUnmounted(() => unregister())

  return isEmpty
}
