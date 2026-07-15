import {
  $createTableNodeWithDimensions,
  getTableObserverFromTableElement,
  $isTableSelection,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import { $getRoot, $getSelection, $nodesOfType, type LexicalEditor } from 'lexical'
import { createApp, defineComponent, h, nextTick, type App } from 'vue'
import { commands } from 'vitest/browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../../src/LexicalComposer'
import { useLexicalComposer } from '../../src/LexicalComposerContext'
import { ContentEditable } from '../../src/LexicalContentEditable'
import { TableCellResizer } from '../../src/LexicalTableCellResizer'
import { TablePlugin } from '../../src/LexicalTablePlugin'

interface PointerTarget {
  index: number
  selector: string
  xRatio: number
  yRatio: number
}

declare module 'vitest/browser' {
  interface BrowserCommands {
    mouseDrag: (from: PointerTarget, to: PointerTarget) => Promise<void>
    mouseDragBy: (from: PointerTarget, deltaX: number, deltaY: number) => Promise<void>
    mouseMove: (target: PointerTarget) => Promise<void>
  }
}

const cell = (index: number, xRatio = 0.5, yRatio = 0.5): PointerTarget => ({
  index,
  selector: 'th, td',
  xRatio,
  yRatio,
})

const handle = (direction: 'bottom' | 'right'): PointerTarget => ({
  index: 0,
  selector: `[data-direction="${direction}"]`,
  xRatio: direction === 'bottom' ? 0.25 : 0.5,
  yRatio: direction === 'right' ? 0.25 : 0.5,
})

const onError = (error: Error) => {
  throw error
}

async function flushEditor(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

async function waitForTableReady(host: HTMLElement): Promise<void> {
  await vi.waitFor(
    () => {
      const table = host.querySelector('table')
      expect(table).not.toBeNull()
      expect(getTableObserverFromTableElement(table!)).not.toBeNull()
    },
    { timeout: 3_000 },
  )
}

function mountTableEditor(): { app: App; editor: LexicalEditor; host: HTMLElement } {
  let editor: LexicalEditor | undefined

  const CaptureEditor = defineComponent({
    setup() {
      editor = useLexicalComposer()
      return () => null
    },
  })

  const Host = defineComponent({
    setup() {
      return () =>
        h(
          LexicalComposer,
          {
            initialConfig: {
              namespace: 'table-browser-test',
              nodes: [TableNode, TableRowNode, TableCellNode],
              onError,
              editorState: () => {
                $getRoot().append($createTableNodeWithDimensions(2, 2, false))
              },
              theme: {
                table: 'browser-table',
                tableCell: 'browser-table-cell',
                tableCellSelected: 'browser-table-cell-selected',
                tableSelection: 'browser-table-selection',
              },
            },
          },
          {
            default: () => [
              h(ContentEditable, { class: 'browser-editor' }),
              h(CaptureEditor),
              h(TablePlugin),
              h(TableCellResizer),
            ],
          },
        )
    },
  })

  const host = document.createElement('div')
  host.dataset.testRoot = 'table-browser'
  document.body.append(host)
  const app = createApp(Host)
  app.mount(host)

  if (editor === undefined) {
    throw new Error('Editor was not captured')
  }

  return { app, editor, host }
}

describe('Lexical tables in a real browser', () => {
  let app: App | undefined
  let style: HTMLStyleElement | undefined

  beforeEach(() => {
    style = document.createElement('style')
    style.textContent = `
      .browser-editor { min-height: 180px; padding: 20px; width: 600px; }
      .browser-table { border-collapse: collapse; table-layout: fixed; width: 400px; }
      .browser-table-cell { border: 1px solid #9ca3af; height: 52px; padding: 8px; }
      .browser-table-cell-selected { background: #bfdbfe; }
      .browser-table-selection, .browser-table-selection * { user-select: none; }
    `
    document.head.append(style)
  })

  afterEach(() => {
    app?.unmount()
    app = undefined
    style?.remove()
    style = undefined
    document.querySelector('[data-test-root="table-browser"]')?.remove()
    document.querySelectorAll('.TableCellResizer__ui').forEach((element) => element.remove())
  })

  it('creates a rectangular table selection with a real mouse drag', async () => {
    const mounted = mountTableEditor()
    app = mounted.app
    await flushEditor()
    await waitForTableReady(mounted.host)

    await commands.mouseDrag(cell(0), cell(3))

    await vi.waitFor(
      () => {
        mounted.editor.getEditorState().read(() => {
          const selection = $getSelection()
          const observer = getTableObserverFromTableElement(mounted.host.querySelector('table')!)!
          expect(observer.tableSelection?.getShape()).toEqual({
            fromX: 0,
            fromY: 0,
            toX: 1,
            toY: 1,
          })
          if ($isTableSelection(selection)) {
            expect(selection.getShape()).toEqual({ fromX: 0, fromY: 0, toX: 1, toY: 1 })
          }
        })
        expect(mounted.host.querySelectorAll('.browser-table-cell-selected')).toHaveLength(4)
      },
      { timeout: 3_000 },
    )
  })

  it('shows boundary feedback and resizes columns and rows with the real mouse', async () => {
    const mounted = mountTableEditor()
    app = mounted.app
    await flushEditor()
    await waitForTableReady(mounted.host)

    let initialColumnWidth = 0
    mounted.editor.getEditorState().read(() => {
      initialColumnWidth = $nodesOfType(TableNode)[0].getColWidths()?.[0] ?? 0
    })

    await commands.mouseMove(cell(0, 0.99, 0.5))
    await vi.waitFor(() => {
      const right = document.querySelector<HTMLElement>('[data-direction="right"]')
      expect(right).not.toBeNull()
      expect(getComputedStyle(right!).backgroundImage).toContain('rgb(118, 182, 255)')
    })
    await commands.mouseDragBy(handle('right'), 40, 0)
    await vi.waitFor(() => {
      mounted.editor.getEditorState().read(() => {
        expect($nodesOfType(TableNode)[0].getColWidths()?.[0]).toBeGreaterThan(initialColumnWidth)
      })
    })

    let initialRowHeight = 0
    mounted.editor.getEditorState().read(() => {
      initialRowHeight = $nodesOfType(TableRowNode)[0].getHeight() ?? 0
    })

    await commands.mouseMove(cell(0, 0.5, 0.9))
    await vi.waitFor(() => {
      const bottom = document.querySelector<HTMLElement>('[data-direction="bottom"]')
      expect(bottom).not.toBeNull()
      expect(getComputedStyle(bottom!).backgroundImage).toContain('rgb(118, 182, 255)')
    })
    await commands.mouseDragBy(handle('bottom'), 0, 30)
    await vi.waitFor(() => {
      mounted.editor.getEditorState().read(() => {
        expect($nodesOfType(TableRowNode)[0].getHeight()).toBeGreaterThan(initialRowHeight)
      })
    })

    mounted.editor.update(() => $nodesOfType(TableNode)[0].remove(), { discrete: true })
    await flushEditor()
    expect(document.querySelector('[data-direction]')).toBeNull()
  })
})
