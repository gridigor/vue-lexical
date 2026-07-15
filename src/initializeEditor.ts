import type { EditorState, LexicalEditor } from 'lexical'
import { $createParagraphNode, $getRoot, $getSelection } from 'lexical'

export type InitialEditorStateType = null | string | EditorState | ((editor: LexicalEditor) => void)

export type InitialEditorState = InitialEditorStateType

export function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  if (initialEditorState === null) {
    return
  }

  if (initialEditorState === undefined) {
    editor.update(
      () => {
        const root = $getRoot()
        if (root.isEmpty()) {
          const paragraph = $createParagraphNode()
          root.append(paragraph)

          if ($getSelection() !== null) {
            paragraph.select()
          }
        }
      },
      { discrete: true, tag: 'history-merge' },
    )
    return
  }

  if (typeof initialEditorState === 'string') {
    editor.setEditorState(editor.parseEditorState(initialEditorState), {
      tag: 'history-merge',
    })
    return
  }

  if (typeof initialEditorState === 'function') {
    editor.update(
      () => {
        if ($getRoot().isEmpty()) {
          initialEditorState(editor)
        }
      },
      {
        discrete: true,
        tag: 'history-merge',
      },
    )
    return
  }

  editor.setEditorState(initialEditorState, { tag: 'history-merge' })
}
