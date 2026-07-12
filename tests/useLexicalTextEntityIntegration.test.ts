import type { LexicalEditor, TextNode } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, $isTextNode } from 'lexical'
import { $createHashtagNode, $isHashtagNode, HashtagNode } from '@lexical/hashtag'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { useLexicalTextEntity, type TextEntityMatcher } from '../src/useLexicalTextEntity'

const onError = (error: Error) => {
  throw error
}

const getMentionMatch: TextEntityMatcher = (text) => {
  const match = /@[a-z0-9_]+/i.exec(text)
  return match === null ? null : { end: match.index + match[0].length, start: match.index }
}

const TextEntityRegistration = defineComponent({
  setup() {
    useLexicalTextEntity(getMentionMatch, HashtagNode, (node: TextNode) =>
      $createHashtagNode(node.getTextContent()),
    )
    return () => null
  },
})

async function updateEditor(editor: LexicalEditor, update: () => void) {
  await new Promise<void>((resolve) => editor.update(update, { onUpdate: resolve }))
  await nextTick()
}

describe('useLexicalTextEntity integration', () => {
  it('wraps matching text and unwraps it when the match changes', async () => {
    const editorRef = shallowRef<LexicalEditor | null>(null)
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'text-entity-integration',
          nodes: [HashtagNode],
          onError,
        },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, {
            editorRef: (nextEditor: LexicalEditor | null) => {
              editorRef.value = nextEditor
            },
          }),
          h(TextEntityRegistration),
        ],
      },
    })
    await nextTick()
    const editor = editorRef.value
    if (editor === null) {
      throw new Error('Expected editor ref')
    }

    await updateEditor(editor, () => {
      $getRoot().append($createParagraphNode().append($createTextNode('Hello @Vue_3!')))
    })

    expect(
      editor.getEditorState().read(() => {
        const mention = $getRoot().getAllTextNodes().find($isHashtagNode)
        return mention?.getTextContent()
      }),
    ).toBe('@Vue_3')

    await updateEditor(editor, () => {
      const mention = $getRoot().getAllTextNodes().find($isHashtagNode)
      if (!$isTextNode(mention)) {
        throw new Error('Expected mention text entity')
      }
      mention.setTextContent('Vue_3')
    })

    expect(
      editor.getEditorState().read(() => $getRoot().getAllTextNodes().some($isHashtagNode)),
    ).toBe(false)

    wrapper.unmount()
  })
})
