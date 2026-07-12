import type { ElementNode, LexicalEditor, RangeSelection, TextNode } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $getRoot,
  $setSelection,
  createEditor,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from 'lexical'
import { mount } from '@vue/test-utils'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import {
  createBasicTypeaheadTriggerMatch,
  MenuOption,
  type MenuSlotProps,
  TypeaheadMenuPlugin,
  type TypeaheadMenuPluginProps,
} from '../src/LexicalTypeaheadMenuPlugin'
import {
  getQueryTextForSearch,
  getTextUpToAnchor,
  isSelectionOnEntityBoundary,
  tryToPositionRange,
} from '../src/menu/LexicalMenu'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly callback: ResizeObserverCallback
  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    TestResizeObserver.instances.push(this)
  }
}

const onError = (error: Error) => {
  throw error
}

let latestSlotProps: MenuSlotProps | null = null

const TestEditor = defineComponent({
  props: {
    onClose: Function as PropType<TypeaheadMenuPluginProps['onClose']>,
    onOpen: Function as PropType<NonNullable<TypeaheadMenuPluginProps['onOpen']>>,
    onQueryChange: {
      type: Function as PropType<TypeaheadMenuPluginProps['onQueryChange']>,
      required: true,
    },
    onSelectOption: {
      type: Function as PropType<TypeaheadMenuPluginProps['onSelectOption']>,
      required: true,
    },
    options: {
      type: Array as PropType<MenuOption[]>,
      required: true,
    },
    preselectFirstItem: Boolean,
    customSlot: Boolean,
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
      { initialConfig: { namespace: 'typeahead', onError } },
      {
        default: () => [
          h(LexicalContentEditable, { 'aria-label': 'Editor' }),
          h(EditorRefPlugin, { editorRef: this.setEditor }),
          h(
            TypeaheadMenuPlugin,
            {
              anchorClassName: 'typeahead-anchor',
              onClose: this.onClose,
              onOpen: this.onOpen,
              onQueryChange: this.onQueryChange,
              onSelectOption: this.onSelectOption,
              options: this.options,
              preselectFirstItem: this.preselectFirstItem,
              triggerFn: createBasicTypeaheadTriggerMatch('@', { minLength: 0 }),
            },
            this.customSlot
              ? {
                  default: (slotProps: MenuSlotProps) => {
                    latestSlotProps = slotProps
                    return h('button', { class: 'custom-option' }, slotProps.matchingString)
                  },
                }
              : undefined,
          ),
        ],
      },
    )
  },
})

async function setEditorText(editor: LexicalEditor, value: string) {
  await new Promise<void>((resolve) =>
    editor.update(
      () => {
        const text = $createTextNode(value)
        $getRoot().clear().append($createParagraphNode().append(text))
        text.selectEnd()
      },
      { onUpdate: resolve },
    ),
  )
  await nextTick()
}

async function mountTypeahead(overrides: Partial<TypeaheadMenuPluginProps> = {}) {
  const callbacks = {
    onClose: vi.fn<NonNullable<TypeaheadMenuPluginProps['onClose']>>(),
    onOpen: vi.fn<NonNullable<TypeaheadMenuPluginProps['onOpen']>>(),
    onQueryChange: vi.fn<TypeaheadMenuPluginProps['onQueryChange']>(),
    onSelectOption: vi.fn<TypeaheadMenuPluginProps['onSelectOption']>(),
  }
  const options = [new MenuOption('Vue'), new MenuOption('Lexical')]
  options[0].title = 'Vue'
  options[1].title = 'Lexical'
  const wrapper = mount(TestEditor, {
    attachTo: document.body,
    props: {
      ...callbacks,
      ...overrides,
      options: (overrides.options as MenuOption[] | undefined) ?? options,
      preselectFirstItem: overrides.preselectFirstItem ?? true,
    },
  })
  await nextTick()
  const editor = wrapper.vm.getEditor()
  if (editor === null) throw new Error('Expected editor')
  return { callbacks, editor, options, wrapper }
}

beforeEach(() => {
  latestSlotProps = null
  TestResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  Range.prototype.getBoundingClientRect = vi.fn(() => new DOMRect(20, 30, 10, 12))
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('createBasicTypeaheadTriggerMatch', () => {
  it('matches configurable triggers and rejects invalid queries', () => {
    const trigger = createBasicTypeaheadTriggerMatch('@', { minLength: 2, maxLength: 4 })
    expect(trigger('Hello @vu', {} as LexicalEditor)).toEqual({
      leadOffset: 6,
      matchingString: 'vu',
      replaceableString: '@vu',
    })
    expect(trigger('@v', {} as LexicalEditor)).toBeNull()
    expect(trigger('email@example', {} as LexicalEditor)).toBeNull()
    expect(trigger('@vuejs', {} as LexicalEditor)).toBeNull()

    const spaces = createBasicTypeaheadTriggerMatch('/', {
      allowWhitespace: true,
      minLength: 0,
      punctuation: ':',
    })
    expect(spaces('/two words', {} as LexicalEditor)?.matchingString).toBe('two words')
  })

  it('reads query text and validates entity boundaries', () => {
    const editor = createEditor()
    editor.update(
      () => {
        const paragraph = $createParagraphNode()
        $getRoot().append(paragraph)
        paragraph.selectEnd()
        expect(getTextUpToAnchor($getSelection() as RangeSelection)).toBeNull()

        const token = $createTextNode('token').setMode('token')
        paragraph.append(token)
        token.selectEnd()
        expect(getTextUpToAnchor($getSelection() as RangeSelection)).toBeNull()
      },
      { discrete: true },
    )
    expect(getQueryTextForSearch(editor)).toBeNull()
    expect(isSelectionOnEntityBoundary(editor, 1)).toBe(false)

    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChildOrThrow() as ElementNode
        const text = $createTextNode('vue')
        paragraph.append(text)
        text.select(0, 0)
      },
      { discrete: true },
    )
    expect(isSelectionOnEntityBoundary(editor, 0)).toBe(false)

    editor.update(() => $getRoot().selectEnd(), { discrete: true })
    expect(isSelectionOnEntityBoundary(editor, 0)).toBe(false)
    editor.update(() => $setSelection(null), { discrete: true })
    expect(isSelectionOnEntityBoundary(editor, 0)).toBe(false)
  })

  it('positions a native range only for a usable collapsed DOM selection', () => {
    const root = document.createElement('div')
    const text = document.createTextNode('@vue')
    root.append(text)
    document.body.append(root)
    const selection = window.getSelection()!
    const nativeRange = document.createRange()
    nativeRange.setStart(text, 4)
    nativeRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nativeRange)

    expect(tryToPositionRange(0, document.createRange(), window, root)).toBe(true)
    expect(tryToPositionRange(99, document.createRange(), window, root)).toBe(false)

    nativeRange.setStart(text, 0)
    nativeRange.setEnd(text, 2)
    selection.removeAllRanges()
    selection.addRange(nativeRange)
    expect(tryToPositionRange(0, document.createRange(), window, root)).toBe(false)

    selection.removeAllRanges()
    expect(tryToPositionRange(0, document.createRange(), window, root)).toBe(false)
    root.remove()
  })
})

describe('TypeaheadMenuPlugin', () => {
  it('opens, renders options, navigates, and selects the query node', async () => {
    let selectedText = ''
    const { callbacks, editor, options, wrapper } = await mountTypeahead({
      onSelectOption: (option, node, close) => {
        selectedText = node?.getTextContent() ?? ''
        expect(option.key).toBe('Lexical')
        close()
      },
    })
    await setEditorText(editor, '@vu')

    expect(callbacks.onQueryChange).toHaveBeenLastCalledWith('vu')
    expect(callbacks.onOpen).toHaveBeenCalledOnce()
    expect(document.querySelector('.typeahead-anchor')).not.toBeNull()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-0')

    const down = new KeyboardEvent('keydown', { cancelable: true })
    expect(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, down)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-1')

    const up = new KeyboardEvent('keydown', { cancelable: true })
    expect(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, up)).toBe(true)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-0')
    editor.dispatchCommand(KEY_ARROW_UP_COMMAND, up)
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-1')

    await wrapper.setProps({ options: [options[0]] })
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-0')
    await wrapper.setProps({ options: [] })
    expect(editor.getRootElement()?.hasAttribute('aria-activedescendant')).toBe(false)
    await wrapper.setProps({ options })
    expect(editor.getRootElement()?.getAttribute('aria-activedescendant')).toBe('typeahead-item-0')
    editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, down)

    expect(editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown'))).toBe(true)
    expect(selectedText).toBe('@vu')
    await nextTick()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0)

    wrapper.unmount()
    expect(options[0].ref.current).toBeNull()
  })

  it('supports mouse selection, escape, tab, and an empty option list', async () => {
    const { callbacks, editor, wrapper } = await mountTypeahead({ preselectFirstItem: false })
    await setEditorText(editor, '@')
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, new KeyboardEvent('keydown'))).toBe(false)
    expect(editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown'))).toBe(false)

    const firstOption = document.querySelector<HTMLElement>('[role="option"]')!
    firstOption.dispatchEvent(new MouseEvent('mouseenter'))
    firstOption.click()
    expect(callbacks.onSelectOption).toHaveBeenCalledOnce()

    await setEditorText(editor, '@v')
    firstOption.dispatchEvent(new MouseEvent('mouseenter'))
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, new KeyboardEvent('keydown'))).toBe(true)
    expect(callbacks.onSelectOption).toHaveBeenCalledTimes(2)

    await setEditorText(editor, '@v')
    expect(editor.dispatchCommand(KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown'))).toBe(true)
    await nextTick()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0)

    await wrapper.setProps({ options: [] })
    await setEditorText(editor, '@v')
    expect(editor.dispatchCommand(KEY_ARROW_DOWN_COMMAND, new KeyboardEvent('keydown'))).toBe(false)
    expect(editor.dispatchCommand(KEY_ARROW_UP_COMMAND, new KeyboardEvent('keydown'))).toBe(false)
    wrapper.unmount()
  })

  it('closes when the editor becomes non-editable or the query disappears', async () => {
    const { callbacks, editor, wrapper } = await mountTypeahead()
    await setEditorText(editor, '@vue')
    editor.setEditable(false)
    await nextTick()
    expect(callbacks.onClose).toHaveBeenCalledOnce()

    editor.setEditable(true)
    await setEditorText(editor, '@vue')
    const composing = vi.spyOn(editor, 'isComposing').mockReturnValue(true)
    editor.update(
      () => {
        const text = $getRoot().getFirstDescendant() as TextNode | null
        if (text !== null) text.setTextContent('@composing')
      },
      { discrete: true },
    )
    composing.mockRestore()

    await setEditorText(editor, 'plain text')
    expect(callbacks.onQueryChange).toHaveBeenLastCalledWith(null)

    await setEditorText(editor, '@vue')
    editor.update(() => $getRoot().clear(), { discrete: true })
    expect(callbacks.onQueryChange).toHaveBeenLastCalledWith(null)
    wrapper.unmount()
  })

  it('waits for asynchronous close and ignores stale close completion', async () => {
    let finishClose: (() => void) | undefined
    const onClose = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClose = resolve
        }),
    )
    const { editor, wrapper } = await mountTypeahead({ onClose })
    await setEditorText(editor, '@v')
    editor.dispatchCommand(KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown'))
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)

    await setEditorText(editor, '@vue')
    finishClose?.()
    await nextTick()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)
    wrapper.unmount()
  })

  it('handles rejected asynchronous close callbacks', async () => {
    const { editor, wrapper } = await mountTypeahead({ onClose: () => Promise.reject('closed') })
    await setEditorText(editor, '@v')
    editor.dispatchCommand(KEY_ESCAPE_COMMAND, new KeyboardEvent('keydown'))
    await nextTick()
    await Promise.resolve()
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0)
    wrapper.unmount()
  })

  it('exposes a scoped Vue slot and closes when the trigger scrolls out of view', async () => {
    const callbacks = {
      onClose: vi.fn(),
      onQueryChange: vi.fn(),
      onSelectOption: vi.fn(),
    }
    const option = new MenuOption('custom')
    const wrapper = mount(TestEditor, {
      attachTo: document.body,
      props: { ...callbacks, customSlot: true, options: [option], preselectFirstItem: true },
    })
    await nextTick()
    const editor = wrapper.vm.getEditor()!
    await setEditorText(editor, '@slot')
    expect(document.querySelector('.custom-option')?.textContent).toBe('slot')

    const selectAfterClose = latestSlotProps!.selectOptionAndCleanUp
    const anchor = document.querySelector<HTMLElement>('.typeahead-anchor')!
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1, 1))
    document.body.dispatchEvent(new Event('scroll', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 30))

    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 1, 1))
    document.body.dispatchEvent(new Event('scroll', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 30))
    await nextTick()
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    selectAfterClose(option)
    expect(callbacks.onSelectOption).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('closes when the DOM query range cannot be positioned', async () => {
    const { callbacks, editor, wrapper } = await mountTypeahead()
    await setEditorText(editor, '@v')
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue(null)
    await setEditorText(editor, '@vue')
    expect(callbacks.onClose).toHaveBeenCalledOnce()
    getSelection.mockRestore()
    wrapper.unmount()
  })
})
