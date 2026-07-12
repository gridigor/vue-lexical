import type { EditorState } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  createEditor,
} from 'lexical'
import { describe, expect, it } from 'vitest'
import { initializeEditor } from '../src/initializeEditor'

const onError = (error: Error) => {
  throw error
}

function createState(text: string): EditorState {
  const source = createEditor({ namespace: 'state-source', onError })
  source.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)))
    },
    { discrete: true },
  )
  return source.getEditorState()
}

describe('initializeEditor', () => {
  it('leaves the editor untouched for null', () => {
    const editor = createEditor({ namespace: 'null-state', onError })
    initializeEditor(editor, null)
    expect(editor.getEditorState().isEmpty()).toBe(true)
  })

  it('does not replace existing content when state is undefined', () => {
    const editor = createEditor({ namespace: 'existing-state', onError })
    editor.setEditorState(createState('existing'))
    initializeEditor(editor)
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('existing')
  })

  it('selects the created paragraph when an empty root has a selection', () => {
    const editor = createEditor({ namespace: 'selected-empty-state', onError })
    editor.update(() => $getRoot().select(), { discrete: true })

    initializeEditor(editor)

    expect(
      editor.getEditorState().read(() => {
        const selection = $getSelection()
        return selection?.getNodes()[0]?.getType()
      }),
    ).toBe('paragraph')
  })

  it('parses a serialized editor state', () => {
    const editor = createEditor({ namespace: 'serialized-state', onError })
    const serialized = JSON.stringify(createState('serialized').toJSON())
    initializeEditor(editor, serialized)
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('serialized')
  })

  it('accepts an EditorState instance', () => {
    const editor = createEditor({ namespace: 'editor-state', onError })
    initializeEditor(editor, createState('state object'))
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('state object')
  })
})
