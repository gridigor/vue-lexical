import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, $isTextNode } from 'lexical'
import { $isHashtagNode, HashtagNode } from '@lexical/hashtag'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { LexicalHashtagPlugin } from '../src/LexicalHashtagPlugin'

const onError = (error: Error) => {
  throw error
}

async function updateEditor(editor: LexicalEditor, update: () => void) {
  await new Promise<void>((resolve) => editor.update(update, { onUpdate: resolve }))
  await nextTick()
}

describe('HashtagPlugin integration', () => {
  it('creates and updates hashtag text entities', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'hashtag-integration',
          nodes: [HashtagNode],
          onError,
        },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(LexicalHashtagPlugin)],
      },
    })
    await nextTick()
    const editor = editorRef.value!

    await updateEditor(editor, () => {
      $getRoot().append($createParagraphNode().append($createTextNode('Hello #Vue3!')))
    })

    expect(
      editor.getEditorState().read(() => {
        const hashtag = $getRoot().getAllTextNodes().find($isHashtagNode)
        return hashtag?.getTextContent()
      }),
    ).toBe('#Vue3')

    await updateEditor(editor, () => {
      const hashtag = $getRoot().getAllTextNodes().find($isHashtagNode)
      if (!$isTextNode(hashtag)) {
        throw new Error('Expected hashtag text')
      }
      hashtag.setTextContent('Vue3')
    })

    expect(
      editor.getEditorState().read(() => $getRoot().getAllTextNodes().some($isHashtagNode)),
    ).toBe(false)

    wrapper.unmount()
  })
})
