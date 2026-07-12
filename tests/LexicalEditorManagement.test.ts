import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, CLEAR_EDITOR_COMMAND } from 'lexical'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { ClearEditorPlugin } from '../src/LexicalClearEditorPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'

const onError = (error: Error) => {
  throw error
}

describe('editor management plugins', () => {
  it('exposes the editor through a Vue ref and clears it on unmount', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'editor-ref', onError },
      },
      slots: {
        default: () => h(EditorRefPlugin, { editorRef }),
      },
    })

    await nextTick()
    expect(editorRef.value).toBeDefined()

    wrapper.unmount()
    expect(editorRef.value).toBeNull()
  })

  it('supports a callback editor ref', async () => {
    const editorRef = vi.fn<(editor: LexicalEditor | null) => void>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'callback-editor-ref', onError },
      },
      slots: {
        default: () => h(EditorRefPlugin, { editorRef }),
      },
    })

    await nextTick()
    expect(editorRef).toHaveBeenCalledOnce()
    expect(editorRef.mock.calls[0]?.[0]?.getEditorState()).toBeDefined()

    wrapper.unmount()
    expect(editorRef).toHaveBeenLastCalledWith(null)
  })

  it('clears the editor with the default CLEAR_EDITOR_COMMAND handler', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'clear-editor',
          onError,
          editorState: () => {
            $getRoot().append($createParagraphNode().append($createTextNode('Remove me')))
          },
        },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(ClearEditorPlugin)],
      },
    })
    await nextTick()

    expect(editorRef.value?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(editorRef.value?.getEditorState().read(() => $getRoot().getTextContent())).toBe('')
    expect(editorRef.value?.getEditorState().read(() => $getRoot().getChildrenSize())).toBe(1)
  })

  it('uses a custom clear handler in place of the default behavior', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const onClear = vi.fn(() => {
      const root = $getRoot()
      root.clear()
      root.append($createParagraphNode().append($createTextNode('Custom content')))
    })
    mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'custom-clear-editor', onError },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(ClearEditorPlugin, { onClear })],
      },
    })
    await nextTick()

    editorRef.value?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)
    await nextTick()

    expect(onClear).toHaveBeenCalledOnce()
    expect(editorRef.value?.getEditorState().read(() => $getRoot().getTextContent())).toBe(
      'Custom content',
    )
  })
})
