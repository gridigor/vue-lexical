import {
  $createTableNodeWithDimensions,
  $findCellNode,
  $isTableSelection,
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $getRoot,
  $isRangeSelection,
  $nodesOfType,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { TablePlugin } from '../src/LexicalTablePlugin'

const onError = (error: Error) => {
  throw error
}

async function flushEditor(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function mountTableEditor(props: Record<string, boolean> = {}, editorState?: () => void) {
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
              namespace: 'table-integration',
              nodes: [TableNode, TableRowNode, TableCellNode],
              onError,
              editorState:
                editorState ??
                (() => {
                  const paragraph = $createParagraphNode().append($createTextNode('Before table'))
                  $getRoot().append(paragraph)
                  paragraph.selectEnd()
                }),
              theme: {
                table: 'editor-table',
                tableCell: 'editor-table-cell',
                tableScrollableWrapper: 'editor-table-scroll',
              },
            },
          },
          {
            default: () => [h(ContentEditable), h(CaptureEditor), h(TablePlugin, hostProps)],
          },
        )
    },
  })

  const wrapper = mount(Host, { attachTo: document.body, props })
  if (editor === undefined) {
    throw new Error('Editor was not captured')
  }

  return { editor, wrapper }
}

describe('Lexical table integration', () => {
  it('inserts tables, applies the scroll wrapper, and enforces the nested table policy', async () => {
    const { editor, wrapper } = mountTableEditor({ hasHorizontalScroll: true })

    expect(
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: '2',
        includeHeaders: true,
        rows: '2',
      }),
    ).toBe(true)
    await flushEditor()

    expect(wrapper.find('.editor-table-scroll').exists()).toBe(true)
    expect(wrapper.find('.editor-table-scroll > .editor-table').exists()).toBe(true)
    expect(wrapper.findAll('th')).toHaveLength(3)
    expect(wrapper.findAll('td')).toHaveLength(1)

    let firstCellKey = ''
    editor.getEditorState().read(() => {
      const tables = $nodesOfType(TableNode)
      expect(tables).toHaveLength(1)
      expect(tables[0].getColumnCount()).toBe(2)
      const firstCell = $nodesOfType(TableCellNode)[0]
      firstCellKey = firstCell.getKey()
    })

    editor.update(
      () => {
        $nodesOfType(TableCellNode)[0].selectStart()
      },
      { discrete: true },
    )
    expect(
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: '1',
        rows: '1',
      }),
    ).toBe(false)

    await wrapper.setProps({ hasNestedTables: true })
    expect(
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        columns: '1',
        rows: '1',
      }),
    ).toBe(true)
    await flushEditor()

    editor.getEditorState().read(() => {
      expect($nodesOfType(TableNode)).toHaveLength(2)
      expect($nodesOfType(TableCellNode).some((cell) => cell.getKey() === firstCellKey)).toBe(true)
    })

    wrapper.unmount()
  })

  it('normalizes merged cells and background colors when those features are disabled', async () => {
    const { editor, wrapper } = mountTableEditor(
      { hasCellBackgroundColor: false, hasCellMerge: false },
      () => {
        const table = $createTableNodeWithDimensions(2, 2, false)
        $getRoot().append(table)
        const firstCell = $nodesOfType(TableCellNode)[0]
        firstCell.setColSpan(2).setRowSpan(2).setBackgroundColor('#ff0000')
      },
    )
    await flushEditor()

    editor.getEditorState().read(() => {
      const cells = $nodesOfType(TableCellNode)
      expect(cells.length).toBeGreaterThanOrEqual(4)
      expect(cells.every((cell) => cell.getColSpan() === 1)).toBe(true)
      expect(cells.every((cell) => cell.getRowSpan() === 1)).toBe(true)
      expect(cells.every((cell) => cell.getBackgroundColor() === null)).toBe(true)
    })

    wrapper.unmount()
  })

  it('moves between cells with Tab only while the tab handler is enabled', async () => {
    const { editor, wrapper } = mountTableEditor()
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '2', rows: '1' })
    await flushEditor()

    let firstCellKey = ''
    editor.update(
      () => {
        const firstCell = $nodesOfType(TableCellNode)[0]
        firstCellKey = firstCell.getKey()
        firstCell.selectStart()
      },
      { discrete: true },
    )

    const tab = new KeyboardEvent('keydown', { cancelable: true, key: 'Tab' })
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, tab)).toBe(true)
    expect(tab.defaultPrevented).toBe(true)
    await flushEditor()
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isRangeSelection(selection)).toBe(true)
      if ($isRangeSelection(selection)) {
        expect($findCellNode(selection.anchor.getNode())?.getKey()).not.toBe(firstCellKey)
      }
    })

    const shiftTab = new KeyboardEvent('keydown', {
      cancelable: true,
      key: 'Tab',
      shiftKey: true,
    })
    expect(editor.dispatchCommand(KEY_TAB_COMMAND, shiftTab)).toBe(true)
    await flushEditor()
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        expect($findCellNode(selection.anchor.getNode())?.getKey()).toBe(firstCellKey)
      }
    })

    await wrapper.setProps({ hasTabHandler: false })
    await flushEditor()
    expect(
      editor.dispatchCommand(
        KEY_TAB_COMMAND,
        new KeyboardEvent('keydown', { cancelable: true, key: 'Tab' }),
      ),
    ).toBe(false)

    wrapper.unmount()
  })

  it('creates a table selection by dragging from one cell to another', async () => {
    const { editor, wrapper } = mountTableEditor()
    editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: '2', rows: '2' })
    await flushEditor()

    const cells = wrapper.findAll('th, td')
    const first = cells[0].element
    const last = cells[3].element
    const originalElementsFromPoint = document.elementsFromPoint
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [last]),
    })

    first.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, buttons: 1 }))
    last.dispatchEvent(
      new MouseEvent('pointermove', {
        bubbles: true,
        buttons: 1,
        clientX: 10,
        clientY: 10,
      }),
    )
    window.dispatchEvent(new MouseEvent('pointerup'))
    await flushEditor()

    editor.getEditorState().read(() => {
      const selection = $getSelection()
      expect($isTableSelection(selection)).toBe(true)
      if ($isTableSelection(selection)) {
        expect(selection.getShape()).toEqual({ fromX: 0, fromY: 0, toX: 1, toY: 1 })
      }
    })

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    })
    wrapper.unmount()
  })
})
