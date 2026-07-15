import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { OnChangePlugin } from '../src/LexicalOnChangePlugin'
import { PlainTextPlugin } from '../src/LexicalPlainTextPlugin'
import { useLexicalEditable } from '../src/useLexicalEditable'

const onError = (error: Error) => {
  throw error
}

function $appendTextToFirstElement(text: string): void {
  const firstChild = $getRoot().getFirstChildOrThrow()
  if (!$isElementNode(firstChild)) {
    throw new Error('Expected the root first child to be an element node.')
  }
  firstChild.append($createTextNode(text))
}

describe('LexicalComposer', () => {
  it('provides one editor and connects it to ContentEditable', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'test-editor', onError },
      },
      slots: {
        default: () => [h(ContentEditable), h(CaptureEditor)],
      },
    })

    await nextTick()
    const root = wrapper.get('[contenteditable="true"]')

    expect(editor).toBeDefined()
    expect(editor?.getRootElement()).toBe(root.element)
    expect(root.attributes('role')).toBe('textbox')
  })

  it('applies a functional initial editor state', () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })

    mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'initial-state',
          onError,
          editorState: () => {
            $getRoot().append($createParagraphNode().append($createTextNode('Hello Vue')))
          },
        },
      },
      slots: { default: () => h(CaptureEditor) },
    })

    expect(editor?.getEditorState().read(() => $getRoot().getTextContent())).toBe('Hello Vue')
  })

  it('forwards recoverable warnings with the editor instance', () => {
    let editor: LexicalEditor | undefined
    const onWarn = vi.fn()
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })
    mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'warning-handler', onError, onWarn },
      },
      slots: { default: () => h(CaptureEditor) },
    })
    const warning = new Error('recoverable warning')
    const warnHandler = Reflect.get(editor as LexicalEditor, '_onWarn') as (error: Error) => void

    warnHandler(warning)

    expect(onWarn).toHaveBeenCalledOnce()
    expect(onWarn).toHaveBeenCalledWith(warning, editor)
  })

  it('registers plain text behavior and emits editor changes', async () => {
    let editor: LexicalEditor | undefined
    const onChange = vi.fn()
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })

    mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'on-change', onError },
      },
      slots: {
        default: () => [
          h(PlainTextPlugin, null, {
            contentEditable: () => h(ContentEditable),
          }),
          h(OnChangePlugin, { onChange }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    editor?.update(
      () => {
        $appendTextToFirstElement('changed')
      },
      { discrete: true },
    )

    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange.mock.calls[0]?.[1]).toBe(editor)
  })

  it('reactively exposes the editable state', async () => {
    let editor: LexicalEditor | undefined
    let editable: ReturnType<typeof useLexicalEditable> | undefined
    const CaptureState = defineComponent({
      setup() {
        editor = useLexicalComposer()
        editable = useLexicalEditable()
        return () => null
      },
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'editable-state', onError },
      },
      slots: { default: () => h(CaptureState) },
    })
    await nextTick()

    expect(editable?.value).toBe(true)
    editor?.setEditable(false)
    await nextTick()
    expect(editable?.value).toBe(false)
    wrapper.unmount()
  })
})
