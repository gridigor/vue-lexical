import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  HISTORY_MERGE_TAG,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { AutoFocusPlugin } from '../src/LexicalAutoFocusPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer, useLexicalComposerContext } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { OnChangePlugin } from '../src/LexicalOnChangePlugin'
import { RichTextPlugin } from '../src/LexicalRichTextPlugin'

const onError = (error: Error) => {
  throw error
}

function createEditorCapture(capture: (editor: LexicalEditor) => void) {
  return defineComponent({
    setup() {
      capture(useLexicalComposer())
      return () => null
    },
  })
}

describe('built-in plugin behavior', () => {
  it('rejects composer context access outside a composer', () => {
    const InvalidConsumer = defineComponent({
      setup() {
        useLexicalComposerContext()
        return () => null
      },
    })

    expect(() => mount(InvalidConsumer)).toThrow('must be used inside a <LexicalComposer>')
  })

  it('rethrows editor errors when no onError callback is configured', () => {
    let editor: LexicalEditor | undefined
    const failure = new Error('unhandled editor failure')
    const CaptureEditor = createEditorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'default-error-handler' } },
      slots: { default: () => h(CaptureEditor) },
    })

    expect(() =>
      editor?.update(
        () => {
          throw failure
        },
        { discrete: true },
      ),
    ).toThrow(failure)
    wrapper.unmount()
  })

  it('focuses the editor with the configured default selection', async () => {
    const focus = vi.fn()
    const CaptureEditor = createEditorCapture((editor) => {
      editor.focus = focus
    })

    mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'autofocus', onError } },
      slots: {
        default: () => [h(CaptureEditor), h(AutoFocusPlugin, { defaultSelection: 'rootStart' })],
      },
    })
    await nextTick()

    expect(focus).toHaveBeenCalledWith(undefined, { defaultSelection: 'rootStart' })
  })

  it('registers rich-text behavior and toggles its placeholder', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = createEditorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'rich-text', onError } },
      slots: {
        default: () => [
          h(RichTextPlugin, null, {
            contentEditable: () => h(ContentEditable, { 'aria-label': 'Rich editor' }),
            placeholder: () => h('span', { 'data-testid': 'placeholder' }, 'Write something'),
          }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="placeholder"]').text()).toBe('Write something')
    editor?.update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected paragraph')
        }
        paragraph.append($createTextNode('content'))
      },
      { discrete: true },
    )
    await nextTick()
    expect(wrapper.find('[data-testid="placeholder"]').exists()).toBe(false)

    wrapper.unmount()
    expect(editor?.getRootElement()).toBeNull()
  })

  it('forwards custom ContentEditable attributes and editable changes', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = createEditorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'editable-attrs', onError } },
      slots: {
        default: () => [
          h(ContentEditable, {
            as: 'section',
            role: 'document',
            spellcheck: false,
          }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    const root = wrapper.get('section')
    expect(root.attributes('role')).toBe('document')
    expect(root.attributes('spellcheck')).toBe('false')
    expect(root.attributes('aria-readonly')).toBe('false')

    editor?.setEditable(false)
    await nextTick()
    expect(root.attributes('contenteditable')).toBe('false')
    expect(root.attributes('aria-readonly')).toBe('true')
  })

  it('ignores selection-only and history-merge updates when configured', async () => {
    let editor: LexicalEditor | undefined
    const onChange = vi.fn()
    const CaptureEditor = createEditorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'ignored-changes', onError } },
      slots: {
        default: () => [
          h(OnChangePlugin, { ignoreSelectionChange: true, onChange }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    editor?.update(
      () => {
        $getRoot().selectEnd()
      },
      { discrete: true },
    )
    editor?.update(
      () => {
        $getRoot().append($createParagraphNode().append($createTextNode('ignored')))
      },
      { discrete: true, tag: HISTORY_MERGE_TAG },
    )

    expect(onChange).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('ignores a dirty root whose text size did not change in MaxLengthPlugin', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = createEditorCapture((value) => {
      editor = value
    })
    const { MaxLengthPlugin } = await import('../src/LexicalMaxLengthPlugin')
    mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'same-size-max-length', onError } },
      slots: {
        default: () => [h(MaxLengthPlugin, { maxLength: 5 }), h(CaptureEditor)],
      },
    })
    await nextTick()

    editor?.update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected paragraph')
        }
        paragraph.append($createTextNode('a'))
      },
      { discrete: true },
    )
    editor?.update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected paragraph')
        }
        paragraph.clear().append($createTextNode('b')).selectEnd()
      },
      { discrete: true },
    )
    expect(editor?.getEditorState().read(() => $getRoot().getTextContent())).toBe('b')
  })
})
