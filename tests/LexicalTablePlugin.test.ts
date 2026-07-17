import type { Signal } from '@lexical/extension'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import type { LexicalEditor } from 'lexical'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { TablePlugin } from '../src/LexicalTablePlugin'

const tableMocks = vi.hoisted(() => ({
  activeScroll: new WeakMap<object, boolean>(),
  getDOMCellFromTarget: vi.fn(),
  registerTableCellUnmergeTransform: vi.fn(),
  registerTablePlugin: vi.fn(),
  registerTableSelectionObserver: vi.fn(),
  setScrollableTablesActive: vi.fn(),
}))

vi.mock('@lexical/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lexical/table')>()

  return {
    ...actual,
    $isScrollableTablesActive: (editor: LexicalEditor) =>
      tableMocks.activeScroll.get(editor) ?? false,
    getDOMCellFromTarget: tableMocks.getDOMCellFromTarget,
    registerTableCellUnmergeTransform: tableMocks.registerTableCellUnmergeTransform,
    registerTablePlugin: tableMocks.registerTablePlugin,
    registerTableSelectionObserver: tableMocks.registerTableSelectionObserver,
    setScrollableTablesActive: tableMocks.setScrollableTablesActive.mockImplementation(
      (editor: LexicalEditor, active: boolean) => {
        tableMocks.activeScroll.set(editor, active)
      },
    ),
  }
})

const onError = (error: Error) => {
  throw error
}

function mountPlugin(props: Record<string, boolean> = {}) {
  let editor: LexicalEditor | undefined

  const CaptureEditor = defineComponent({
    setup() {
      editor = useLexicalComposer()
      return () => null
    },
  })

  const Host = defineComponent({
    props: {
      hasCellMerge: { type: Boolean, default: true },
      hasCellBackgroundColor: { type: Boolean, default: true },
      hasTabHandler: { type: Boolean, default: true },
      hasHorizontalScroll: { type: Boolean, default: false },
      hasNestedTables: { type: Boolean, default: false },
    },
    setup(hostProps) {
      return () =>
        h(
          LexicalComposer,
          {
            initialConfig: {
              namespace: 'table-plugin',
              nodes: [TableNode, TableRowNode, TableCellNode],
              onError,
            },
          },
          {
            default: () => [h(ContentEditable), h(CaptureEditor), h(TablePlugin, hostProps)],
          },
        )
    },
  })
  const wrapper = mount(Host, { props })

  if (editor === undefined) {
    throw new Error('Editor was not captured')
  }

  return { editor, wrapper }
}

describe('LexicalTablePlugin', () => {
  beforeEach(() => {
    tableMocks.activeScroll = new WeakMap<object, boolean>()
    tableMocks.getDOMCellFromTarget.mockReset()
    tableMocks.registerTableCellUnmergeTransform.mockReset()
    tableMocks.registerTablePlugin.mockReset()
    tableMocks.registerTableSelectionObserver.mockReset()
    tableMocks.setScrollableTablesActive.mockClear()
    tableMocks.registerTablePlugin.mockImplementation(() => vi.fn())
    tableMocks.registerTableSelectionObserver.mockImplementation(() => vi.fn())
    tableMocks.registerTableCellUnmergeTransform.mockImplementation(() => vi.fn())
  })

  it('registers the default table lifecycle and cleans it up', () => {
    const unregisterTable = vi.fn()
    const unregisterSelection = vi.fn()
    tableMocks.registerTablePlugin.mockReturnValue(unregisterTable)
    tableMocks.registerTableSelectionObserver.mockReturnValue(unregisterSelection)

    const { editor, wrapper } = mountPlugin()
    const nestedTables = tableMocks.registerTablePlugin.mock.calls[0][1]
      ?.hasNestedTables as Signal<boolean>

    expect(tableMocks.registerTablePlugin).toHaveBeenCalledWith(editor, {
      hasNestedTables: nestedTables,
    })
    expect(nestedTables.peek()).toBe(false)
    expect(tableMocks.registerTableSelectionObserver).toHaveBeenCalledWith(editor, true)
    expect(tableMocks.registerTableCellUnmergeTransform).not.toHaveBeenCalled()
    expect(tableMocks.setScrollableTablesActive).not.toHaveBeenCalled()

    wrapper.unmount()
    expect(unregisterSelection).toHaveBeenCalledOnce()
    expect(unregisterTable).toHaveBeenCalledOnce()
  })

  it('reacts to every table option and removes cell styles when disabled', async () => {
    const unregisterInitialSelection = vi.fn()
    const unregisterNextSelection = vi.fn()
    const unregisterUnmerge = vi.fn()
    const unregisterBackground = vi.fn()
    tableMocks.registerTableSelectionObserver
      .mockReturnValueOnce(unregisterInitialSelection)
      .mockReturnValueOnce(unregisterNextSelection)
    tableMocks.registerTableCellUnmergeTransform.mockReturnValue(unregisterUnmerge)

    const { editor, wrapper } = mountPlugin()
    const registerTransform = vi
      .spyOn(editor, 'registerNodeTransform')
      .mockImplementation(() => unregisterBackground)

    await wrapper.setProps({
      hasCellBackgroundColor: false,
      hasCellMerge: false,
      hasHorizontalScroll: true,
      hasNestedTables: true,
      hasTabHandler: false,
    })
    await nextTick()

    const nestedTables = tableMocks.registerTablePlugin.mock.calls[0][1]
      ?.hasNestedTables as Signal<boolean>
    expect(nestedTables.peek()).toBe(true)
    expect(unregisterInitialSelection).toHaveBeenCalledOnce()
    expect(tableMocks.registerTableSelectionObserver).toHaveBeenLastCalledWith(editor, false)
    expect(tableMocks.registerTableCellUnmergeTransform).toHaveBeenCalledWith(editor)
    expect(registerTransform).toHaveBeenCalledWith(TableCellNode, expect.any(Function))
    expect(tableMocks.setScrollableTablesActive).toHaveBeenCalledWith(editor, true)

    const transform = registerTransform.mock.calls[0][1]
    const setBackgroundColor = vi.fn()
    transform({
      getBackgroundColor: () => '#fff',
      setBackgroundColor,
    } as unknown as TableCellNode)
    transform({
      getBackgroundColor: () => null,
      setBackgroundColor,
    } as unknown as TableCellNode)
    expect(setBackgroundColor).toHaveBeenCalledOnce()
    expect(setBackgroundColor).toHaveBeenCalledWith(null)

    await wrapper.setProps({
      hasCellBackgroundColor: true,
      hasCellMerge: true,
      hasHorizontalScroll: false,
    })
    await nextTick()

    expect(unregisterUnmerge).toHaveBeenCalledOnce()
    expect(unregisterBackground).toHaveBeenCalledOnce()
    expect(tableMocks.setScrollableTablesActive).toHaveBeenLastCalledWith(editor, false)

    wrapper.unmount()
    expect(unregisterNextSelection).toHaveBeenCalledOnce()
  })

  it('requires all three table node classes', () => {
    expect(() =>
      mount(LexicalComposer, {
        props: {
          initialConfig: {
            namespace: 'missing-table-nodes',
            onError,
          },
        },
        slots: { default: () => h(TablePlugin) },
      }),
    ).toThrow(/must be registered/)
  })

  it('prevents native selection only during a mouse-driven table selection', async () => {
    tableMocks.getDOMCellFromTarget.mockReturnValue({})
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const { editor, wrapper } = mountPlugin()
    await nextTick()
    const root = wrapper.get('[contenteditable]').element
    expect(editor.getRootElement()).toBe(root)
    expect(root.ownerDocument.defaultView).toBe(window)

    const pointerDown = new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      pointerType: 'mouse',
    })
    Object.defineProperty(pointerDown, 'target', { value: root })
    const findGuardListener = (type: string) =>
      addEventListener.mock.calls.find(
        ([eventType, listener]) =>
          eventType === type && String(listener).includes('isTablePointerDown'),
      )?.[1]
    const pointerDownListener = findGuardListener('pointerdown')
    const pointerMoveListener = findGuardListener('pointermove')
    const pointerUpListener = findGuardListener('pointerup')
    expect(pointerDownListener).toBeTypeOf('function')
    expect(pointerMoveListener).toBeTypeOf('function')
    expect(pointerUpListener).toBeTypeOf('function')
    ;(pointerDownListener as EventListener)(pointerDown)
    expect(tableMocks.getDOMCellFromTarget).toHaveBeenCalledWith(root)
    const tableMove = new PointerEvent('pointermove', {
      bubbles: true,
      buttons: 1,
      cancelable: true,
    })
    ;(pointerMoveListener as EventListener)(tableMove)
    expect(tableMove.defaultPrevented).toBe(true)

    ;(pointerUpListener as EventListener)(new PointerEvent('pointerup', { bubbles: true }))
    const stoppedMove = new PointerEvent('pointermove', {
      bubbles: true,
      buttons: 1,
      cancelable: true,
    })
    ;(pointerMoveListener as EventListener)(stoppedMove)
    expect(stoppedMove.defaultPrevented).toBe(false)

    const touchDown = new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      pointerType: 'touch',
    })
    Object.defineProperty(touchDown, 'target', { value: root })
    ;(pointerDownListener as EventListener)(touchDown)
    const touchMove = new PointerEvent('pointermove', {
      bubbles: true,
      buttons: 1,
      cancelable: true,
    })
    ;(pointerMoveListener as EventListener)(touchMove)
    expect(touchMove.defaultPrevented).toBe(false)

    wrapper.unmount()
    addEventListener.mockRestore()
  })
})
