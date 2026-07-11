import type { EditorConfig, LexicalEditor, LexicalNode, NodeKey } from 'lexical'
import type { VNodeChild } from 'vue'
import { $create, $getNodeByKey, $getRoot, DecoratorNode } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'

const onError = (error: Error) => {
  throw error
}

const decoratorMounted = vi.fn()
const decoratorUnmounted = vi.fn()

const TestDecoratorView = defineComponent({
  name: 'TestDecoratorView',
  props: {
    label: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    onMounted(decoratorMounted)
    onUnmounted(decoratorUnmounted)

    return () => h('button', { 'data-testid': 'decorator' }, props.label)
  },
})

class TestDecoratorNode extends DecoratorNode<VNodeChild> {
  label = ''

  static getType(): string {
    return 'test-vue-decorator'
  }

  static clone(node: TestDecoratorNode): TestDecoratorNode {
    const clone = new TestDecoratorNode(node.getKey())
    clone.label = node.label
    return clone
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement('div')
    element.className = 'decorator-host'
    return element
  }

  updateDOM(): boolean {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(): VNodeChild {
    return h(TestDecoratorView, { label: this.getLabel() })
  }

  getLabel(): string {
    return this.getLatest().label
  }

  setLabel(label: string): this {
    const writable = this.getWritable()
    writable.label = label
    return writable
  }
}

function $createTestDecoratorNode(label: string): TestDecoratorNode {
  return $create(TestDecoratorNode).setLabel(label)
}

function $getTestDecoratorNode(key: NodeKey): TestDecoratorNode {
  const node: LexicalNode | null = $getNodeByKey(key)
  if (!(node instanceof TestDecoratorNode)) {
    throw new Error(`Expected a TestDecoratorNode for key ${key}.`)
  }
  return node
}

function createEditorCapture(onCapture: (editor: LexicalEditor) => void) {
  return defineComponent({
    name: 'EditorCapture',
    setup() {
      onCapture(useLexicalComposer())
      return () => null
    },
  })
}

describe('LexicalDecorators', () => {
  it('renders, updates, and removes Vue DecoratorNode content', async () => {
    decoratorMounted.mockClear()
    decoratorUnmounted.mockClear()
    let editor: LexicalEditor | undefined
    let decoratorKey: NodeKey | undefined
    const CaptureEditor = createEditorCapture((nextEditor) => {
      editor = nextEditor
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'vue-decorator',
          nodes: [TestDecoratorNode],
          onError,
          editorState: () => {
            const decorator = $createTestDecoratorNode('initial')
            decoratorKey = decorator.getKey()
            $getRoot().append(decorator)
          },
        },
      },
      slots: {
        default: () => [h(ContentEditable), h(CaptureEditor)],
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.get('[data-testid="decorator"]').text()).toBe('initial')
    expect(decoratorMounted).toHaveBeenCalledOnce()
    if (decoratorKey === undefined) {
      throw new Error('Expected the initial decorator node to have a key.')
    }
    const key = decoratorKey

    editor?.update(
      () => {
        $getTestDecoratorNode(key).setLabel('updated')
      },
      { discrete: true },
    )
    await nextTick()

    expect(wrapper.get('[data-testid="decorator"]').text()).toBe('updated')
    expect(decoratorMounted).toHaveBeenCalledOnce()

    editor?.update(
      () => {
        $getTestDecoratorNode(key).remove()
      },
      { discrete: true },
    )
    await nextTick()

    expect(wrapper.find('[data-testid="decorator"]').exists()).toBe(false)
    expect(decoratorUnmounted).toHaveBeenCalledOnce()
  })

  it('moves decorators to a replacement root and cleans them up on unmount', async () => {
    decoratorMounted.mockClear()
    decoratorUnmounted.mockClear()
    const rootKey = ref(0)
    const ReplaceableContentEditable = defineComponent({
      name: 'ReplaceableContentEditable',
      setup() {
        return () => h(ContentEditable, { key: rootKey.value })
      },
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'replace-decorator-root',
          nodes: [TestDecoratorNode],
          onError,
          editorState: () => {
            $getRoot().append($createTestDecoratorNode('root content'))
          },
        },
      },
      slots: {
        default: () => h(ReplaceableContentEditable),
      },
    })

    await nextTick()
    await nextTick()
    const firstRoot = wrapper.get('[contenteditable]').element

    rootKey.value += 1
    await nextTick()
    await nextTick()

    expect(wrapper.get('[contenteditable]').element).not.toBe(firstRoot)
    expect(wrapper.get('[data-testid="decorator"]').text()).toBe('root content')

    wrapper.unmount()
    expect(decoratorUnmounted).toHaveBeenCalled()
  })
})
