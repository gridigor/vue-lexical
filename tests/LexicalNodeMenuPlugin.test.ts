import { mount } from '@vue/test-utils'
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import {
  MenuOption,
  type MenuSlotProps,
  NodeMenuPlugin,
  type NodeMenuPluginProps,
} from '../src/LexicalNodeMenuPlugin'

class TestResizeObserver {
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()
}

const onError = (error: Error) => {
  throw error
}

let latestSlotProps: MenuSlotProps | null = null

const TestEditor = defineComponent({
  props: {
    customSlot: Boolean,
    nodeKey: {
      type: String as PropType<NodeKey | null>,
      default: null,
    },
    onClose: Function as PropType<NodeMenuPluginProps['onClose']>,
    onOpen: Function as PropType<NonNullable<NodeMenuPluginProps['onOpen']>>,
    onSelectOption: {
      type: Function as PropType<NodeMenuPluginProps['onSelectOption']>,
      required: true,
    },
    options: {
      type: Array as PropType<MenuOption[]>,
      required: true,
    },
    parent: Object as PropType<HTMLElement>,
  },
  setup() {
    let editor: LexicalEditor | null = null
    return {
      getEditor: () => editor,
      setEditor: (value: LexicalEditor | null) => {
        editor = value
      },
    }
  },
  render() {
    return h(
      LexicalComposer,
      { initialConfig: { namespace: 'node-menu', onError } },
      {
        default: () => [
          h(LexicalContentEditable, { 'aria-label': 'Editor' }),
          h(EditorRefPlugin, { editorRef: this.setEditor }),
          h(
            NodeMenuPlugin,
            {
              anchorClassName: 'node-menu-anchor',
              nodeKey: this.nodeKey,
              onClose: this.onClose,
              onOpen: this.onOpen,
              onSelectOption: this.onSelectOption,
              options: this.options,
              parent: this.parent,
            },
            this.customSlot
              ? {
                  default: (slotProps: MenuSlotProps) => {
                    latestSlotProps = slotProps
                    return h('button', { class: 'custom-menu' }, 'Custom')
                  },
                }
              : undefined,
          ),
        ],
      },
    )
  },
})

function createOptions() {
  const options = [new MenuOption('Edit'), new MenuOption('Delete')]
  options[0].title = 'Edit'
  options[1].title = 'Delete'
  return options
}

async function mountMenu(overrides: Record<string, unknown> = {}) {
  const callbacks = {
    onClose: vi.fn<NonNullable<NodeMenuPluginProps['onClose']>>(),
    onOpen: vi.fn<NonNullable<NodeMenuPluginProps['onOpen']>>(),
    onSelectOption: vi.fn<NodeMenuPluginProps['onSelectOption']>(),
  }
  const wrapper = mount(TestEditor, {
    attachTo: document.body,
    props: {
      ...callbacks,
      nodeKey: null,
      options: createOptions(),
      ...overrides,
    },
  })
  await nextTick()
  const editor = wrapper.vm.getEditor()
  if (editor === null) throw new Error('Expected editor')
  return { callbacks, editor, wrapper }
}

async function addParagraph(editor: LexicalEditor): Promise<NodeKey> {
  let key = ''
  await new Promise<void>((resolve) =>
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode('Target'))
        $getRoot().append(paragraph)
        key = paragraph.getKey()
      },
      { onUpdate: resolve },
    ),
  )
  const element = editor.getElementByKey(key)
  if (element === null) throw new Error('Expected paragraph element')
  element.getBoundingClientRect = () => new DOMRect(24, 30, 100, 20)
  return key
}

beforeEach(() => {
  latestSlotProps = null
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('NodeMenuPlugin', () => {
  it('opens at a node, renders options, and selects with the mouse', async () => {
    const parent = document.createElement('section')
    document.body.append(parent)
    const { callbacks, editor, wrapper } = await mountMenu({ parent })
    const nodeKey = await addParagraph(editor)

    await wrapper.setProps({ nodeKey })
    await nextTick()

    const anchor = parent.querySelector<HTMLElement>('#node-menu')
    expect(anchor?.className).toBe('node-menu-anchor')
    expect(anchor?.getAttribute('aria-label')).toBe('Node menu')
    expect(anchor?.style.width).toBe('100px')
    expect(anchor?.textContent).toContain('EditDelete')
    expect(editor.getRootElement()?.getAttribute('aria-controls')).toBe('node-menu')
    expect(callbacks.onOpen).toHaveBeenCalledOnce()

    const options = wrapper.props('options')
    if (anchor === null) throw new Error('Expected node menu anchor')
    ;(anchor.querySelectorAll('li')[1] as HTMLElement).dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true }),
    )
    ;(anchor.querySelectorAll('li')[1] as HTMLElement).click()
    await nextTick()
    expect(callbacks.onSelectOption).toHaveBeenCalledWith(
      options[1],
      null,
      expect.any(Function),
      '',
    )
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('node-menu-item-1')

    await wrapper.setProps({ nodeKey: null })
    await nextTick()
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    expect(parent.querySelector('#node-menu')).toBeNull()
    wrapper.unmount()
    expect(parent.querySelector('.node-menu-anchor')).toBeNull()
    parent.remove()
  })

  it('supports arrow, enter, tab, escape, resize, and scroll behavior', async () => {
    const { callbacks, editor, wrapper } = await mountMenu()
    const nodeKey = await addParagraph(editor)
    await wrapper.setProps({ nodeKey })
    await nextTick()

    const event = new KeyboardEvent('keydown')
    expect(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('node-menu-item-1')
    expect(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('node-menu-item-0')
    expect(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('node-menu-item-1')
    expect(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('node-menu-item-0')
    expect(
      editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown', { shiftKey: true })),
    ).toBe(false)
    expect(editor.dispatchCommand(KEY_ENTER_COMMAND, event)).toBe(true)
    expect(callbacks.onSelectOption).toHaveBeenCalledOnce()
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, event)).toBe(true)
    expect(callbacks.onSelectOption).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new Event('resize'))
    document.dispatchEvent(new Event('scroll'))
    expect(editor.dispatchCommand(KEY_ESCAPE_COMMAND, event)).toBe(true)
    await nextTick()
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    expect(editor.dispatchCommand(KEY_ESCAPE_COMMAND, event)).toBe(false)
    wrapper.unmount()
  })

  it('renders a scoped slot and reacts to option changes', async () => {
    const { editor, wrapper } = await mountMenu({ customSlot: true })
    const nodeKey = await addParagraph(editor)
    await wrapper.setProps({ nodeKey })
    await nextTick()

    expect(document.querySelector('.custom-menu')?.textContent).toBe('Custom')
    expect(latestSlotProps?.matchingString).toBe('')
    expect(latestSlotProps?.selectedIndex).toBe(0)
    latestSlotProps?.setHighlightedIndex(1)
    expect(latestSlotProps?.selectedIndex).toBe(0)
    await nextTick()
    expect(latestSlotProps?.selectedIndex).toBe(1)

    await wrapper.setProps({ options: [createOptions()[0]] })
    await nextTick()
    expect(latestSlotProps?.selectedIndex).toBe(0)

    await wrapper.setProps({ options: [] })
    await nextTick()
    expect(document.querySelector('.custom-menu')).toBeNull()
    expect(editor.getRootElement()?.hasAttribute('aria-activedescendant')).toBe(false)

    await wrapper.setProps({ options: createOptions() })
    await nextTick()
    expect(latestSlotProps?.selectedIndex).toBe(0)
    latestSlotProps?.selectOptionAndCleanUp(wrapper.props('options')[0])
    await wrapper.setProps({ nodeKey: null })
    await nextTick()
    latestSlotProps?.selectOptionAndCleanUp(wrapper.props('options')[0])
    wrapper.unmount()
  })

  it('ignores missing nodes and closes when the target is removed', async () => {
    const { callbacks, editor, wrapper } = await mountMenu()
    await wrapper.setProps({ nodeKey: 'missing' })
    expect(callbacks.onOpen).not.toHaveBeenCalled()

    const nodeKey = await addParagraph(editor)
    await wrapper.setProps({ nodeKey })
    await nextTick()
    editor.update(() => $getNodeByKey(nodeKey)?.remove())
    await nextTick()
    await wrapper.setProps({ nodeKey: null })
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('does not handle option commands when no option can be selected', async () => {
    const options: MenuOption[] = []
    const { editor, wrapper } = await mountMenu({ options })
    await wrapper.setProps({ options: [] })
    await wrapper.setProps({ options })
    const nodeKey = await addParagraph(editor)
    await wrapper.setProps({ nodeKey })
    await nextTick()

    const event = new KeyboardEvent('keydown')
    expect(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, event)).toBe(false)
    expect(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, event)).toBe(false)
    options.push(new MenuOption('Late'))
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, event)).toBe(false)
    expect(editor.dispatchCommand(KEY_ENTER_COMMAND, event)).toBe(false)
    wrapper.unmount()
  })

  it('waits for asynchronous close handlers and handles rejection', async () => {
    let resolveClose: (() => void) | undefined
    const onClose = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClose = resolve
        }),
    )
    const { editor, wrapper } = await mountMenu({ onClose })
    const nodeKey = await addParagraph(editor)
    await wrapper.setProps({ nodeKey })
    await nextTick()
    await wrapper.setProps({ nodeKey: null })
    expect(document.querySelector('#node-menu')).not.toBeNull()
    resolveClose?.()
    await Promise.resolve()
    await nextTick()
    expect(document.querySelector('#node-menu')).toBeNull()
    wrapper.unmount()

    const rejected = await mountMenu({ onClose: () => Promise.reject(new Error('close')) })
    const rejectedKey = await addParagraph(rejected.editor)
    await rejected.wrapper.setProps({ nodeKey: rejectedKey })
    await nextTick()
    await rejected.wrapper.setProps({ nodeKey: null })
    await Promise.resolve()
    await nextTick()
    expect(document.querySelector('#node-menu')).toBeNull()
    rejected.wrapper.unmount()
  })
})
