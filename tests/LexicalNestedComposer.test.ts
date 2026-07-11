import { createEmptyHistoryState, type HistoryState } from '@lexical/history'
import type { EditorConfig, LexicalEditor, NodeKey } from 'lexical'
import type { VNodeChild } from 'vue'
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  DecoratorNode,
  HISTORY_PUSH_TAG,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { HistoryPlugin } from '../src/LexicalHistoryPlugin'
import { LexicalNestedComposer } from '../src/LexicalNestedComposer'

const onError = (error: Error) => {
  throw error
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

describe('LexicalNestedComposer', () => {
  it('provides the nested editor and inherits parent configuration', async () => {
    const parentTheme = { paragraph: 'parent-paragraph' }
    const nestedEditor = createEditor()
    let parentEditor: LexicalEditor | undefined
    let providedEditor: LexicalEditor | undefined
    const CaptureParent = createEditorCapture((editor) => {
      parentEditor = editor
    })
    const CaptureNested = createEditorCapture((editor) => {
      providedEditor = editor
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'parent-editor',
          editable: false,
          theme: parentTheme,
          onError,
        },
      },
      slots: {
        default: () => [
          h(CaptureParent),
          h(
            LexicalNestedComposer,
            { initialEditor: nestedEditor },
            { default: () => h(CaptureNested) },
          ),
        ],
      },
    })

    await nextTick()

    expect(providedEditor).toBe(nestedEditor)
    expect(nestedEditor._parentEditor).toBe(parentEditor)
    expect(nestedEditor._config.namespace).toBe('parent-editor')
    expect(nestedEditor._config.theme).toBe(parentEditor?._config.theme)
    expect([...nestedEditor._nodes.keys()]).toEqual([...(parentEditor?._nodes.keys() ?? [])])
    expect(nestedEditor.isEditable()).toBe(false)

    parentEditor?.setEditable(true)
    expect(nestedEditor.isEditable()).toBe(true)

    wrapper.unmount()
    parentEditor?.setEditable(false)
    expect(nestedEditor.isEditable()).toBe(true)
  })

  it('preserves explicit namespace and can manage editable state independently', async () => {
    const nestedTheme = { paragraph: 'nested-paragraph' }
    const nestedEditor = createEditor({ namespace: 'nested-editor' })
    nestedEditor.setEditable(true)

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'parent-editor',
          editable: false,
          onError,
        },
      },
      slots: {
        default: () =>
          h(LexicalNestedComposer, {
            initialEditor: nestedEditor,
            initialTheme: nestedTheme,
            skipEditableListener: true,
          }),
      },
    })

    await nextTick()

    expect(nestedEditor._config.namespace).toBe('nested-editor')
    expect(nestedEditor._config.theme).toBe(nestedTheme)
    expect(nestedEditor.isEditable()).toBe(true)

    wrapper.unmount()
  })
})

const NestedEditorView = defineComponent({
  name: 'NestedEditorView',
  props: {
    editor: {
      type: Object as () => LexicalEditor,
      required: true,
    },
    historyState: {
      type: Object as () => HistoryState,
      required: true,
    },
  },
  setup(props) {
    return () =>
      h(
        LexicalNestedComposer,
        { initialEditor: props.editor },
        {
          default: () => [
            h(ContentEditable, { 'data-testid': 'nested-editor' }),
            h(HistoryPlugin, { externalHistoryState: props.historyState }),
          ],
        },
      )
  },
})

class NestedEditorDecoratorNode extends DecoratorNode<VNodeChild> {
  nestedEditor: LexicalEditor
  historyState: HistoryState

  constructor(
    nestedEditor: LexicalEditor = createEditor(),
    historyState: HistoryState = createEmptyHistoryState(),
    key?: NodeKey,
  ) {
    super(key)
    this.nestedEditor = nestedEditor
    this.historyState = historyState
  }

  static getType(): string {
    return 'nested-editor-decorator'
  }

  static clone(node: NestedEditorDecoratorNode): NestedEditorDecoratorNode {
    return new NestedEditorDecoratorNode(node.nestedEditor, node.historyState, node.getKey())
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('div')
  }

  updateDOM(): boolean {
    return false
  }

  setNestedEditor(nestedEditor: LexicalEditor, historyState: HistoryState): this {
    const writable = this.getWritable()
    writable.nestedEditor = nestedEditor
    writable.historyState = historyState
    return writable
  }

  decorate(): VNodeChild {
    return h(NestedEditorView, {
      editor: this.nestedEditor,
      historyState: this.historyState,
    })
  }
}

describe('LexicalNestedComposer integration', () => {
  it('mounts inside a DecoratorNode and shares history with its parent', async () => {
    const historyState = createEmptyHistoryState()
    const nestedEditor = createEditor({ namespace: 'caption-editor', onError })
    nestedEditor.update(
      () => {
        $getRoot().append($createParagraphNode())
      },
      { discrete: true },
    )
    let parentEditor: LexicalEditor | undefined
    const CaptureParent = createEditorCapture((editor) => {
      parentEditor = editor
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'decorator-parent',
          nodes: [NestedEditorDecoratorNode],
          onError,
          editorState: () => {
            $getRoot().append(
              $create(NestedEditorDecoratorNode).setNestedEditor(nestedEditor, historyState),
            )
          },
        },
      },
      slots: {
        default: () => [
          h(ContentEditable, { 'data-testid': 'parent-editor' }),
          h(HistoryPlugin, { externalHistoryState: historyState }),
          h(CaptureParent),
        ],
      },
    })

    await nextTick()
    await nextTick()

    const nestedElement = wrapper.get('[data-testid="nested-editor"]').element
    expect(nestedEditor.getRootElement()).toBe(nestedElement)
    expect(nestedEditor._parentEditor).toBe(parentEditor)

    for (const text of ['first', ' second']) {
      nestedEditor.update(
        () => {
          const paragraph = $getRoot().getFirstChildOrThrow()
          if (!$isElementNode(paragraph)) {
            throw new Error('Expected a nested paragraph.')
          }
          paragraph.append($createTextNode(text))
        },
        { discrete: true, tag: HISTORY_PUSH_TAG },
      )
    }

    expect(historyState.current?.editor).toBe(nestedEditor)
    expect(historyState.undoStack.some((entry) => entry.editor === nestedEditor)).toBe(true)

    parentEditor?.update(
      () => {
        $getRoot().append($createParagraphNode().append($createTextNode('parent change')))
      },
      { discrete: true, tag: HISTORY_PUSH_TAG },
    )

    expect(historyState.current?.editor).toBe(parentEditor)
    expect(historyState.undoStack.some((entry) => entry.editor === nestedEditor)).toBe(true)

    wrapper.unmount()
  })
})
