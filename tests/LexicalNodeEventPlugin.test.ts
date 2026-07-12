import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  ParagraphNode,
  TextNode,
  type Klass,
  type LexicalNode,
} from 'lexical'
import { mount } from '@vue/test-utils'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { LexicalNodeEventPlugin, type NodeEventListener } from '../src/LexicalNodeEventPlugin'

const onError = (error: Error) => {
  throw error
}

const TestEditor = defineComponent({
  props: {
    nodeType: {
      type: Function as unknown as PropType<Klass<LexicalNode>>,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    eventListener: {
      type: Function as PropType<NodeEventListener>,
      required: true,
    },
  },
  setup() {
    let editor: LexicalEditor | null = null

    return {
      getEditor: () => editor,
      setEditor: (nextEditor: LexicalEditor | null) => {
        editor = nextEditor
      },
    }
  },
  render() {
    return h(
      LexicalComposer,
      { initialConfig: { namespace: 'node-events', onError } },
      {
        default: () => [
          h(LexicalContentEditable, { 'aria-label': 'Editor' }),
          h(EditorRefPlugin, { editorRef: this.setEditor }),
          h(LexicalNodeEventPlugin, {
            eventListener: this.eventListener,
            eventType: this.eventType,
            nodeType: this.nodeType,
          }),
        ],
      },
    )
  },
})

async function createEditor(
  nodeType: Klass<LexicalNode>,
  eventType: string,
  eventListener: NodeEventListener,
) {
  const wrapper = mount(TestEditor, { props: { eventListener, eventType, nodeType } })
  await nextTick()

  const editor = wrapper.vm.getEditor()
  if (editor === null) {
    throw new Error('Expected editor ref')
  }
  await new Promise<void>((resolve) =>
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('Vue Lexical')))
      },
      { onUpdate: resolve },
    ),
  )
  await nextTick()

  return { editor, wrapper }
}

describe('NodeEventPlugin', () => {
  it('finds a matching Lexical parent for bubbling events', async () => {
    const listener = vi.fn<NodeEventListener>()
    const { editor, wrapper } = await createEditor(ParagraphNode, 'click', listener)
    const textElement = wrapper.get('[data-lexical-text]').element
    const paragraphKey = editor.getEditorState().read(() => $getRoot().getFirstChild()!.getKey())

    textElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(expect.any(MouseEvent), editor, paragraphKey)

    wrapper.unmount()
    textElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(listener).toHaveBeenCalledOnce()
  })

  it('uses capture semantics for mouseenter and only matches the nearest node', async () => {
    const listener = vi.fn<NodeEventListener>()
    const { editor, wrapper } = await createEditor(ParagraphNode, 'mouseenter', listener)
    const paragraphElement = wrapper.get('p').element
    const textElement = wrapper.get('[data-lexical-text]').element
    const paragraphKey = editor.getEditorState().read(() => $getRoot().getFirstChild()!.getKey())

    textElement.dispatchEvent(new MouseEvent('mouseenter'))
    expect(listener).not.toHaveBeenCalled()

    paragraphElement.dispatchEvent(new MouseEvent('mouseenter'))
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith(expect.any(MouseEvent), editor, paragraphKey)

    wrapper.unmount()
  })

  it('uses the latest callback and re-registers only when nodeType changes', async () => {
    const firstListener = vi.fn<NodeEventListener>()
    const nextListener = vi.fn<NodeEventListener>()
    const { wrapper } = await createEditor(TextNode, 'click', firstListener)
    const textElement = wrapper.get('[data-lexical-text]').element

    await wrapper.setProps({ eventListener: nextListener, eventType: 'dblclick' })
    textElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(firstListener).not.toHaveBeenCalled()
    expect(nextListener).toHaveBeenCalledOnce()

    await wrapper.setProps({ nodeType: ParagraphNode })
    textElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(nextListener).toHaveBeenCalledOnce()

    textElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(nextListener).toHaveBeenCalledTimes(2)

    wrapper.unmount()
  })
})
