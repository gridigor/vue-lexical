import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  INDENT_CONTENT_COMMAND,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { TabIndentationPlugin } from '../src/LexicalTabIndentationPlugin'

const onError = (error: Error) => {
  throw error
}

function getFirstBlockIndent(editor: LexicalEditor): number {
  return editor.getEditorState().read(() => {
    const node = $getRoot().getFirstChildOrThrow()
    if (!$isElementNode(node)) {
      throw new Error('Expected the first root child to be an element')
    }
    return node.getIndent()
  })
}

function mountEditor(options: { canIndent?: () => boolean; maxIndent?: number } = {}) {
  const editorRef = shallowRef<LexicalEditor | null>()
  const wrapper = mount(LexicalComposer, {
    props: {
      initialConfig: {
        namespace: 'tab-indentation-integration',
        onError,
        editorState: () => {
          const paragraph = $createParagraphNode().append($createTextNode('Indented text'))
          $getRoot().append(paragraph)
          paragraph.selectStart()
        },
      },
    },
    slots: {
      default: () => [h(EditorRefPlugin, { editorRef }), h(TabIndentationPlugin, options)],
    },
  })

  return { editorRef, wrapper }
}

describe('TabIndentationPlugin integration', () => {
  it('indents the selected block up to maxIndent and unregisters on unmount', async () => {
    const { editorRef, wrapper } = mountEditor({ maxIndent: 2 })
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getFirstBlockIndent(editor)).toBe(1)

    expect(editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getFirstBlockIndent(editor)).toBe(1)

    wrapper.unmount()
    expect(editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)).toBe(false)
  })

  it('respects the canIndent predicate', async () => {
    const { editorRef, wrapper } = mountEditor({ canIndent: () => false })
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getFirstBlockIndent(editor)).toBe(0)

    wrapper.unmount()
  })
})
