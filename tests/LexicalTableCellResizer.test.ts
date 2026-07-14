import {
  $createTableNodeWithDimensions,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import { $getRoot, $nodesOfType, type LexicalEditor } from 'lexical'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import {
  TABLE_CELL_MIN_COLUMN_WIDTH,
  TABLE_CELL_MIN_ROW_HEIGHT,
  TableCellResizer,
} from '../src/LexicalTableCellResizer'
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

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    toJSON: () => ({}),
    top,
    width,
    x: left,
    y: top,
  }
}

function pointerEvent(type: string, x = 0, y = 0): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  })
}

function mountResizer(rows = 2, columns = 2, withWidths = false) {
  let editor: LexicalEditor | undefined

  const CaptureEditor = defineComponent({
    setup() {
      editor = useLexicalComposer()
      return () => null
    },
  })

  const wrapper = mount(LexicalComposer, {
    attachTo: document.body,
    props: {
      initialConfig: {
        namespace: 'table-cell-resizer',
        nodes: [TableNode, TableRowNode, TableCellNode],
        onError,
        editorState: () => {
          const table = $createTableNodeWithDimensions(rows, columns, false)
          if (withWidths) {
            table.setColWidths(Array(columns).fill(120))
          }
          $getRoot().append(table)
        },
        theme: { table: 'table', tableCell: 'cell' },
      },
    },
    slots: {
      default: () => [h(ContentEditable), h(CaptureEditor), h(TablePlugin), h(TableCellResizer)],
    },
  })

  if (editor === undefined) {
    throw new Error('Editor was not captured')
  }
  return { editor, wrapper }
}

function getHandle(direction: 'right' | 'bottom'): HTMLElement {
  const handle = document.body.querySelector<HTMLElement>(`[data-direction="${direction}"]`)
  if (handle === null) {
    throw new Error(`Missing ${direction} resize handle`)
  }
  return handle
}

describe('LexicalTableCellResizer', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resizes a column and row, updates its UI, and respects editor lifecycle', async () => {
    const { editor, wrapper } = mountResizer()
    await flushEditor()

    const cell = wrapper.get('td').element as HTMLElement
    const paragraph = cell.querySelector('p') as HTMLElement
    const table = wrapper.get('table').element as HTMLElement
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(rect(20, 30, 120, 50))
    vi.spyOn(table, 'getBoundingClientRect').mockReturnValue(rect(20, 30, 240, 100))
    for (const element of wrapper.findAll('td')) {
      Object.defineProperty(element.element, 'clientHeight', { configurable: true, value: 50 })
    }

    paragraph.firstChild?.dispatchEvent(pointerEvent('pointermove'))
    wrapper.get('td').element.dispatchEvent(pointerEvent('pointermove', 139, 40))
    await flushEditor()
    expect(getHandle('right').style.cursor).toBe('col-resize')
    expect(getHandle('right').style.backgroundImage).toContain('118, 182, 255')
    expect(getHandle('bottom').style.cursor).toBe('row-resize')

    cell.dispatchEvent(pointerEvent('pointermove', 40, 79))
    await nextTick()
    expect(getHandle('bottom').style.backgroundImage).toContain('118, 182, 255')

    paragraph.dispatchEvent(pointerEvent('pointermove'))
    getHandle('right').dispatchEvent(pointerEvent('pointerenter'))
    await nextTick()
    expect(getHandle('right').style.backgroundImage).toContain('118, 182, 255')
    getHandle('right').dispatchEvent(pointerEvent('pointerleave'))

    const right = getHandle('right')
    right.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    cell.dispatchEvent(pointerEvent('pointermove', 120, 100))
    right.dispatchEvent(pointerEvent('pointermove', 130, 100))
    await nextTick()
    expect(getHandle('right').style.width).toBe('3px')
    right.dispatchEvent(pointerEvent('pointerup', 150, 100))
    await flushEditor()

    editor.getEditorState().read(() => {
      expect($nodesOfType(TableNode)[0].getColWidths()?.[0]).toBe(TABLE_CELL_MIN_COLUMN_WIDTH + 50)
    })

    cell.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    const bottom = getHandle('bottom')
    bottom.dispatchEvent(pointerEvent('pointerenter'))
    bottom.dispatchEvent(pointerEvent('pointerleave'))
    bottom.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    bottom.dispatchEvent(pointerEvent('pointermove', 100, 115))
    await nextTick()
    expect(getHandle('bottom').style.height).toBe('3px')
    bottom.dispatchEvent(pointerEvent('pointerup', 100, 120))
    await flushEditor()

    editor.getEditorState().read(() => {
      expect($nodesOfType(TableRowNode)[0].getHeight()).toBe(70)
    })

    wrapper.get('td').element.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    const secondBottom = getHandle('bottom')
    secondBottom.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    secondBottom.dispatchEvent(pointerEvent('pointerup', 100, 110))
    await flushEditor()
    editor.getEditorState().read(() => {
      expect($nodesOfType(TableRowNode)[0].getHeight()).toBe(80)
    })

    wrapper.get('td').element.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    editor.setEditable(false)
    await nextTick()
    expect(document.body.querySelector('[data-direction]')).toBeNull()

    editor.setEditable(true)
    await nextTick()
    wrapper.get('td').element.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    expect(getHandle('right')).toBeInstanceOf(HTMLElement)

    editor.update(() => $nodesOfType(TableNode)[0].remove(), { discrete: true })
    await flushEditor()
    expect(document.body.querySelector('[data-direction]')).toBeNull()

    wrapper.unmount()
  })

  it('keeps existing widths, clamps dimensions, and handles multiple tables', async () => {
    const { editor, wrapper } = mountResizer(1, 1, true)
    await flushEditor()
    const cell = wrapper.get('td').element as HTMLElement
    const table = wrapper.get('table').element as HTMLElement
    vi.spyOn(cell, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 120, 40))
    vi.spyOn(table, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 120, 40))
    Object.defineProperty(cell, 'clientHeight', { configurable: true, value: 40 })

    cell.dispatchEvent(pointerEvent('pointermove'))
    cell.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    const right = getHandle('right')
    right.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    right.dispatchEvent(pointerEvent('pointerup', -100, 100))
    await flushEditor()
    editor.getEditorState().read(() => {
      expect($nodesOfType(TableNode)[0].getColWidths()).toEqual([TABLE_CELL_MIN_COLUMN_WIDTH])
    })

    cell.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    const bottom = getHandle('bottom')
    bottom.dispatchEvent(pointerEvent('pointerdown', 100, 100))
    bottom.dispatchEvent(pointerEvent('pointerup', 100, -100))
    await flushEditor()
    editor.getEditorState().read(() => {
      expect($nodesOfType(TableRowNode)[0].getHeight()).toBe(TABLE_CELL_MIN_ROW_HEIGHT)
    })

    editor.update(
      () => {
        $getRoot().append($createTableNodeWithDimensions(1, 1, false))
      },
      { discrete: true },
    )
    await flushEditor()
    editor.update(
      () => {
        $nodesOfType(TableNode)[0].remove()
      },
      { discrete: true },
    )
    await flushEditor()
    expect(wrapper.find('table').exists()).toBe(true)

    wrapper.get('[contenteditable]').element.dispatchEvent(pointerEvent('pointermove'))
    await flushEditor()
    expect(document.body.querySelector('[data-direction]')).toBeNull()

    wrapper.unmount()
  })
})
