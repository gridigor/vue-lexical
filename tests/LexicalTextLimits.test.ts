import { $isOverflowNode, OverflowNode } from '@lexical/overflow'
import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode } from 'lexical'
import { mount } from '@vue/test-utils'
import type { Ref } from 'vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  CharacterLimitPlugin,
  type CharacterLimitSlotProps,
} from '../src/LexicalCharacterLimitPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { MaxLengthPlugin } from '../src/LexicalMaxLengthPlugin'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { useLexicalIsTextContentEmpty } from '../src/useLexicalIsTextContentEmpty'

const onError = (error: Error) => {
  throw error
}

async function flushEditorUpdates(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function replaceText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const textNode = $createTextNode(text)
      $getRoot().clear().append($createParagraphNode().append(textNode))
      textNode.selectEnd()
    },
    { discrete: true },
  )
}

describe('text limit plugins', () => {
  it('reports remaining characters and wraps overflowing text', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'character-limit', nodes: [OverflowNode], onError },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(
            CharacterLimitPlugin,
            { maxLength: 5 },
            {
              default: ({ remainingCharacters }: CharacterLimitSlotProps) =>
                h('output', { 'data-testid': 'remaining' }, remainingCharacters),
            },
          ),
        ],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '1234567')
    await flushEditorUpdates()

    expect(wrapper.get('[data-testid="remaining"]').text()).toBe('-2')
    expect(
      editorRef.value?.getEditorState().read(() => {
        const paragraph = $getRoot().getFirstChild()
        return $isElementNode(paragraph) && $isOverflowNode(paragraph.getLastChild())
      }),
    ).toBe(true)
  })

  it('can measure the limit in UTF-8 bytes', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'utf8-limit', nodes: [OverflowNode], onError },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(CharacterLimitPlugin, { charset: 'UTF-8', maxLength: 4 }),
        ],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '😀a')
    await flushEditorUpdates()

    expect(wrapper.get('.characters-limit').text()).toBe('-1')
    expect(wrapper.get('.characters-limit').classes()).toContain('characters-limit-exceeded')
  })

  it('trims text that exceeds the hard maximum length', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'max-length', onError },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(MaxLengthPlugin, { maxLength: 5 })],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '1234567')
    await flushEditorUpdates()

    expect(editorRef.value?.getEditorState().read(() => $getRoot().getTextContent())).toBe('12345')
  })

  it('reactively tracks empty and whitespace-only text', async () => {
    let editor: LexicalEditor | undefined
    let isEmpty: Readonly<Ref<boolean>> | undefined
    let isTrimmedEmpty: Readonly<Ref<boolean>> | undefined
    const CaptureState = defineComponent({
      setup() {
        editor = useLexicalComposer()
        isEmpty = useLexicalIsTextContentEmpty(editor, false)
        isTrimmedEmpty = useLexicalIsTextContentEmpty(editor, true)
        return () => null
      },
    })
    mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'empty-content', onError },
      },
      slots: { default: () => h(CaptureState) },
    })
    await nextTick()

    expect(isEmpty?.value).toBe(true)
    expect(isTrimmedEmpty?.value).toBe(true)

    replaceText(editor!, '   ')
    await flushEditorUpdates()
    expect(isEmpty?.value).toBe(false)
    expect(isTrimmedEmpty?.value).toBe(true)

    replaceText(editor!, ' x ')
    await flushEditorUpdates()
    expect(isTrimmedEmpty?.value).toBe(false)
  })
})
