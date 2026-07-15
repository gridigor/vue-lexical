import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  createCommand,
  createEditor,
  defineExtension,
} from 'lexical'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onScopeDispose } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExtensionComponent } from '../src/ExtensionComponent'
import { LexicalExtensionComposer } from '../src/LexicalExtensionComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { generateTreeViewContent, TreeView, type TreeViewProps } from '../src/LexicalTreeView'
import { TreeViewExtension } from '../src/TreeViewExtension'

const LOG_COMMAND = createCommand<string>('TREE_VIEW_TEST_COMMAND')
const UNKNOWN_COMMAND = createCommand<string>()

const TreeRootExtension = defineExtension({
  $initialEditorState: () => {
    $getRoot().append($createParagraphNode().append($createTextNode('hello tree')))
  },
  dependencies: [TreeViewExtension],
  name: 'tree-view-root',
  namespace: 'tree-view-root',
})

function createTestEditor(text = 'initial'): LexicalEditor {
  const editor = createEditor({
    namespace: `tree-view-${text}`,
    onError: (error) => {
      throw error
    },
  })
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)))
    },
    { discrete: true },
  )
  return editor
}

async function settleTreeView(): Promise<void> {
  await nextTick()
  await flushPromises()
  await nextTick()
}

async function appendState(editor: LexicalEditor, text: string): Promise<void> {
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)))
    },
    { discrete: true },
  )
  await settleTreeView()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TreeViewExtension', () => {
  it('renders devtools content, command logs, export DOM, and all configurable props', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        const unregisterLog = editor.registerCommand(LOG_COMMAND, () => true, COMMAND_PRIORITY_LOW)
        const unregisterUnknown = editor.registerCommand(
          UNKNOWN_COMMAND,
          () => true,
          COMMAND_PRIORITY_LOW,
        )
        onScopeDispose(() => {
          unregisterLog()
          unregisterUnknown()
        })
        return () => null
      },
    })
    const customPrintNode: NonNullable<TreeViewProps['customPrintNode']> = (node) =>
      node.getType() === 'text' ? 'custom text node' : undefined
    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: TreeRootExtension },
      slots: {
        default: () => [
          h(ExtensionComponent, { extension: TreeViewExtension }),
          h(ExtensionComponent, {
            customPrintNode,
            extension: TreeViewExtension,
            timeTravelButtonClassName: 'custom-time-travel',
            timeTravelPanelButtonClassName: 'custom-panel-button',
            timeTravelPanelClassName: 'custom-panel',
            timeTravelPanelSliderClassName: 'custom-slider',
            treeTypeButtonClassName: 'custom-toggle',
            viewClassName: 'custom-tree',
          }),
          h(CaptureEditor),
        ],
      },
    })
    await settleTreeView()

    expect(wrapper.get('.tree-view-output pre').text()).toContain('root')
    expect(wrapper.get('.tree-view-output pre').text()).toContain('text "hello tree"')
    expect(wrapper.get('.debug-treetype-button').element).toBeInstanceOf(HTMLButtonElement)
    expect(wrapper.get('.custom-tree pre').text()).toContain('custom text node')
    expect(wrapper.get('.custom-toggle').text()).toBe('Export DOM')

    editor!.dispatchCommand(LOG_COMMAND, 'payload')
    editor!.dispatchCommand(UNKNOWN_COMMAND, 'unknown payload')
    await settleTreeView()
    expect(wrapper.get('.custom-tree pre').text()).toContain('TREE_VIEW_TEST_COMMAND')
    expect(wrapper.get('.custom-tree pre').text()).toContain('UNKNOWN')

    await wrapper.get('.custom-toggle').trigger('click')
    await settleTreeView()
    expect(wrapper.get('.custom-toggle').text()).toBe('Tree')
    expect(wrapper.get('.custom-tree pre').text()).toContain('<p>')
    expect(wrapper.get('.custom-tree pre').text()).toContain('hello tree')

    await wrapper.get('.custom-toggle').trigger('click')
    await settleTreeView()
    expect(wrapper.get('.custom-tree pre').text()).toContain('custom text node')
    expect(generateTreeViewContent(editor!.getEditorState(), true)).toContain('"hello tree"')
    expect(generateTreeViewContent(editor!.getEditorState())).toContain('text "hello tree"')

    editor!.setEditable(false)
    await settleTreeView()
    wrapper.unmount()
  })

  it('records states and supports slider, playback, pause, and exit time travel', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const editor = createTestEditor()
    const rootElement = document.createElement('div')
    editor.setRootElement(rootElement)
    const wrapper = mount(TreeView, {
      props: {
        editor,
        timeTravelButtonClassName: 'time-travel',
        timeTravelPanelButtonClassName: 'panel-button',
        timeTravelPanelClassName: 'panel',
        timeTravelPanelSliderClassName: 'slider',
      },
    })
    await settleTreeView()
    vi.advanceTimersByTime(10)
    await appendState(editor, 'second')
    vi.advanceTimersByTime(10)
    await appendState(editor, 'third')

    await wrapper.get('.time-travel').trigger('click')
    expect(rootElement.contentEditable).toBe('false')
    expect(wrapper.get('.panel').element).toBeInstanceOf(HTMLDivElement)
    expect(wrapper.get('.slider').attributes('min')).toBe('1')
    expect(wrapper.findAll('.panel-button').map((button) => button.text())).toEqual([
      'Play',
      'Exit',
    ])

    await wrapper.get('.panel-button').trigger('click')
    expect(wrapper.get('.panel-button').text()).toBe('Pause')
    await wrapper.get('.panel-button').trigger('click')
    expect(wrapper.get('.panel-button').text()).toBe('Play')

    const slider = wrapper.get<HTMLInputElement>('.slider')
    slider.element.value = '1'
    await slider.trigger('change')
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe(
      'initial\n\nsecond',
    )

    await wrapper.get('.panel-button').trigger('click')
    expect(wrapper.get('.panel-button').text()).toBe('Pause')
    await wrapper.get('.panel-button').trigger('click')
    expect(wrapper.get('.panel-button').text()).toBe('Play')

    await wrapper.get('.panel-button').trigger('click')
    await vi.runAllTimersAsync()
    await settleTreeView()
    expect(wrapper.get('.panel-button').text()).toBe('Play')
    expect(slider.element.value).toBe('2')

    await wrapper.findAll('.panel-button')[1]!.trigger('click')
    await settleTreeView()
    expect(rootElement.contentEditable).toBe('true')
    expect(wrapper.find('.panel').exists()).toBe(false)
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe(
      'initial\n\nsecond\n\nthird',
    )

    wrapper.unmount()
    editor.setRootElement(null)
  })

  it('handles a missing editor root and ignores an invalid time travel index', async () => {
    const editor = createTestEditor('no root')
    const wrapper = mount(TreeView, { props: { editor } })
    await settleTreeView()
    await appendState(editor, 'second')
    await appendState(editor, 'third')

    await wrapper.get('button:nth-of-type(2)').trigger('click')
    const slider = wrapper.get<HTMLInputElement>('input')
    slider.element.value = '99'
    await slider.trigger('change')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await settleTreeView()

    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.unmount()
  })

  it('limits a large state until explicitly requested and cleans the DOM editor reference', async () => {
    const editor = createEditor({
      namespace: 'large-tree',
      onError: (error) => {
        throw error
      },
    })
    editor.update(
      () => {
        const root = $getRoot()
        for (let index = 0; index < 1000; index += 1) {
          root.append($createParagraphNode().append($createTextNode(String(index))))
        }
      },
      { discrete: true },
    )
    const wrapper = mount(TreeView, { props: { editor } })
    await settleTreeView()

    expect(wrapper.text()).toContain('Detected large EditorState')
    expect(wrapper.find('pre').exists()).toBe(false)
    await wrapper.get('button:last-of-type').trigger('click')
    await settleTreeView()

    const pre = wrapper.get('pre').element as HTMLPreElement & {
      __lexicalEditor?: LexicalEditor | null
    }
    expect(pre.__lexicalEditor).toBe(editor)
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('pre').text()).toContain('999')

    wrapper.unmount()
    expect(pre.__lexicalEditor).toBeNull()
  })

  it('reports custom printer failures and reconnects when the editor prop changes', async () => {
    const firstEditor = createTestEditor('first editor')
    const secondEditor = createTestEditor('second editor')
    const wrapper = mount(TreeView, {
      props: {
        customPrintNode: () => {
          throw 'string failure'
        },
        editor: firstEditor,
      },
    })
    await settleTreeView()
    expect(wrapper.get('pre').text()).toContain('Error rendering tree: string failure')

    await wrapper.setProps({
      customPrintNode: () => {
        throw new Error('error failure')
      },
      editor: secondEditor,
    })
    await appendState(secondEditor, 'changed')
    expect(wrapper.get('pre').text()).toContain('Error rendering tree: error failure')
    expect(
      (wrapper.get('pre').element as HTMLPreElement & { __lexicalEditor?: LexicalEditor })
        .__lexicalEditor,
    ).toBe(secondEditor)

    firstEditor.update(
      () => {
        $getRoot().append($createParagraphNode())
      },
      { discrete: true },
    )
    await settleTreeView()
    expect(wrapper.get('pre').text()).toContain('error failure')
    wrapper.unmount()
  })
})
