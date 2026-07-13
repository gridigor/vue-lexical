import { mount } from '@vue/test-utils'
import { $createParagraphNode, $createTextNode, $getRoot, type LexicalEditor } from 'lexical'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import {
  NodeContextMenuOption,
  type NodeContextMenuPluginProps,
  NodeContextMenuPlugin,
  NodeContextMenuSeparator,
  type NodeContextMenuSlotProps,
} from '../src/LexicalNodeContextMenuPlugin'

const onError = (error: Error) => {
  throw error
}

let latestSlotProps: NodeContextMenuSlotProps | null = null

const TestEditor = defineComponent({
  props: {
    customSlot: Boolean,
    items: {
      type: Array as PropType<NodeContextMenuPluginProps['items']>,
      required: true,
    },
    nested: Boolean,
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
      { initialConfig: { namespace: 'context-menu', onError } },
      {
        default: () => [
          h(LexicalContentEditable, { 'aria-label': 'Editor' }),
          h(EditorRefPlugin, { editorRef: this.setEditor }),
          h(
            NodeContextMenuPlugin,
            {
              className: 'context-menu',
              id: 'context-menu',
              itemClassName: 'context-item',
              items: this.items,
              label: 'Actions',
              nested: this.nested,
              parent: this.parent,
              separatorClassName: 'context-separator',
            },
            this.customSlot
              ? {
                  default: (slotProps: NodeContextMenuSlotProps) => {
                    latestSlotProps = slotProps
                    return h('button', { class: 'custom-context' }, 'Custom context')
                  },
                }
              : undefined,
          ),
        ],
      },
    )
  },
})

function createItems(onEdit = vi.fn(), onDelete = vi.fn()) {
  return [
    new NodeContextMenuSeparator(),
    new NodeContextMenuOption('Disabled', { disabled: true, $onSelect: vi.fn() }),
    new NodeContextMenuOption('Edit', {
      icon: h('span', { class: 'edit-icon' }),
      $onSelect: onEdit,
      $showOn: (node) => node.getType() === 'paragraph',
    }),
    new NodeContextMenuSeparator({ $showOn: () => true }),
    new NodeContextMenuOption('Delete', { $onSelect: onDelete }),
    new NodeContextMenuOption('Hidden', { $onSelect: vi.fn(), $showOn: () => false }),
  ]
}

async function mountContextMenu(overrides: Record<string, unknown> = {}) {
  const wrapper = mount(TestEditor, {
    attachTo: document.body,
    props: {
      items: createItems(),
      ...overrides,
    },
  })
  await nextTick()
  const editor = wrapper.vm.getEditor()
  if (editor === null) throw new Error('Expected editor')
  await new Promise<void>((resolve) =>
    editor.update(
      () => $getRoot().append($createParagraphNode().append($createTextNode('Target'))),
      { onUpdate: resolve },
    ),
  )
  return { editor, wrapper }
}

function openAt(editor: LexicalEditor, x = 30, y = 40) {
  const paragraph = editor.getRootElement()?.querySelector('p')
  if (paragraph === null || paragraph === undefined) throw new Error('Expected paragraph')
  paragraph.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }),
  )
}

function keydown(menu: Element, key: string, modifiers: KeyboardEventInit = {}) {
  menu.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers }),
  )
}

beforeEach(() => {
  latestSlotProps = null
})

describe('NodeContextMenuOption', () => {
  it('stores item and separator configuration', () => {
    const onSelect = vi.fn()
    const option = new NodeContextMenuOption('Edit', { $onSelect: onSelect })
    const separator = new NodeContextMenuSeparator()
    expect(option).toMatchObject({ disabled: false, key: 'Edit', title: 'Edit', type: 'item' })
    expect(option.$onSelect).toBe(onSelect)
    expect(separator).toMatchObject({ key: '_separator', type: 'separator' })
  })
})

describe('NodeContextMenuPlugin', () => {
  it('filters and renders items at the clicked Lexical node', async () => {
    const parent = document.createElement('aside')
    document.body.append(parent)
    const { editor, wrapper } = await mountContextMenu({ nested: true, parent })
    openAt(editor)
    await nextTick()

    const menu = parent.querySelector<HTMLElement>('#context-menu')
    expect(menu?.getAttribute('role')).toBe('menu')
    expect(menu?.getAttribute('aria-label')).toBe('Actions')
    expect(menu?.getAttribute('data-nested')).toBe('true')
    expect(menu?.style.left).toBe('34px')
    expect(menu?.style.top).toBe('45px')
    expect(menu?.textContent).toContain('DisabledEditDelete')
    expect(menu?.textContent).not.toContain('Hidden')
    expect(menu?.querySelectorAll('.context-separator')).toHaveLength(2)
    expect(menu?.querySelector('.edit-icon')).not.toBeNull()
    expect(menu?.querySelector('button[tabindex="0"]')?.textContent).toBe('Edit')

    wrapper.unmount()
    parent.remove()
  })

  it('navigates by keyboard, typeahead, and selects enabled options', async () => {
    vi.useFakeTimers()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const items = createItems(onEdit, onDelete)
    const { editor, wrapper } = await mountContextMenu({ items })
    openAt(editor)
    await nextTick()
    const menu = document.querySelector('#context-menu') as HTMLElement

    keydown(menu, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Delete')
    keydown(menu, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Edit')
    keydown(menu, 'ArrowUp')
    expect(document.activeElement?.textContent).toBe('Delete')
    keydown(menu, 'Home')
    expect(document.activeElement?.textContent).toBe('Edit')
    keydown(menu, 'End')
    expect(document.activeElement?.textContent).toBe('Delete')
    keydown(menu, 'e')
    expect(document.activeElement?.textContent).toBe('Edit')
    keydown(menu, 'd')
    vi.advanceTimersByTime(500)
    keydown(menu, 'Control', { ctrlKey: true })
    keydown(menu, 'Enter')
    expect(onEdit).toHaveBeenCalledOnce()
    await nextTick()
    expect(document.querySelector('#context-menu')).toBeNull()

    openAt(editor)
    await nextTick()
    const reopened = document.querySelector('#context-menu') as HTMLElement
    keydown(reopened, 'End')
    keydown(reopened, ' ')
    expect(onDelete).toHaveBeenCalledOnce()
    wrapper.unmount()
    vi.useRealTimers()
  })

  it('closes with escape, outside pointer, resize, scroll, and item changes', async () => {
    const { editor, wrapper } = await mountContextMenu()
    openAt(editor)
    await nextTick()
    keydown(document.querySelector('#context-menu') as HTMLElement, 'Escape')
    await nextTick()
    expect(document.querySelector('#context-menu')).toBeNull()

    openAt(editor)
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('#context-menu')).toBeNull()

    openAt(editor)
    await nextTick()
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(document.querySelector('#context-menu')).toBeNull()

    openAt(editor)
    await nextTick()
    document.dispatchEvent(new Event('scroll'))
    await nextTick()
    expect(document.querySelector('#context-menu')).toBeNull()

    openAt(editor)
    await nextTick()
    await wrapper.setProps({ items: createItems() })
    expect(document.querySelector('#context-menu')).toBeNull()
    wrapper.unmount()
  })

  it('supports scoped slots and empty or disabled menus', async () => {
    const disabled = new NodeContextMenuOption('Disabled', {
      disabled: true,
      $onSelect: vi.fn(),
    })
    const { editor, wrapper } = await mountContextMenu({
      customSlot: true,
      items: [new NodeContextMenuSeparator(), disabled],
    })
    openAt(editor, window.innerWidth + 100, window.innerHeight + 100)
    await nextTick()
    expect(document.querySelector('.custom-context')).not.toBeNull()
    expect(latestSlotProps?.activeIndex).toBeNull()
    keydown(document.querySelector('#context-menu') as HTMLElement, 'ArrowDown')
    latestSlotProps?.setActiveIndex(1)
    latestSlotProps?.select(disabled)
    expect(disabled.$onSelect).not.toHaveBeenCalled()
    latestSlotProps?.close()
    await nextTick()
    expect(document.querySelector('.custom-context')).toBeNull()

    openAt(editor)
    await nextTick()
    const menu = document.querySelector('#context-menu') as HTMLElement
    menu.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(document.querySelector('#context-menu')).not.toBeNull()
    latestSlotProps?.close()
    await nextTick()
    latestSlotProps?.close()
    wrapper.unmount()
  })

  it('selects items with the mouse', async () => {
    const onDelete = vi.fn()
    const { editor, wrapper } = await mountContextMenu({ items: createItems(vi.fn(), onDelete) })
    openAt(editor)
    await nextTick()
    const buttons = document.querySelectorAll<HTMLButtonElement>('#context-menu button')
    buttons[2]?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    buttons[2]?.click()
    expect(onDelete).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
