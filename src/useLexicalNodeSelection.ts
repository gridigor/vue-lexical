import type { LexicalEditor, NodeKey } from 'lexical'
import type { Ref } from 'vue'
import {
  $createNodeSelection,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $setSelection,
} from 'lexical'
import { onMounted, onUnmounted, readonly, ref } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export type SetLexicalNodeSelected = (selected: boolean) => void
export type ClearLexicalNodeSelection = () => void
export type LexicalNodeSelection = readonly [
  Readonly<Ref<boolean>>,
  SetLexicalNodeSelected,
  ClearLexicalNodeSelection,
]

function isNodeSelected(editor: LexicalEditor, key: NodeKey): boolean {
  return editor.read('latest', () => $getNodeByKey(key)?.isSelected() ?? false)
}

/** Tracks and updates the NodeSelection state for one Lexical node. */
export function useLexicalNodeSelection(key: NodeKey): LexicalNodeSelection {
  const editor = useLexicalComposer()
  const isSelected = ref(isNodeSelected(editor, key))
  let unregister: (() => void) | undefined

  onMounted(() => {
    isSelected.value = isNodeSelected(editor, key)
    unregister = editor.registerUpdateListener(() => {
      isSelected.value = isNodeSelected(editor, key)
    })
  })
  onUnmounted(() => unregister?.())

  const setSelected: SetLexicalNodeSelected = (selected) => {
    editor.update(() => {
      let selection = $getSelection()

      if (!$isNodeSelection(selection)) {
        selection = $createNodeSelection()
        $setSelection(selection)
      }

      if ($isNodeSelection(selection)) {
        if (selected) {
          selection.add(key)
        } else {
          selection.delete(key)
        }
      }
    })
  }

  const clearSelection: ClearLexicalNodeSelection = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isNodeSelection(selection)) {
        selection.clear()
      }
    })
  }

  return [readonly(isSelected), setSelected, clearSelection]
}
