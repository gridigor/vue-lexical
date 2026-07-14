import {
  $computeTableMapSkipCellCheck,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $isTableCellNode,
  $isTableRowNode,
  getDOMCellFromTarget,
  getTableElement,
  type TableCellNode,
  type TableDOMCell,
  TableNode,
} from '@lexical/table'
import { calculateZoomLevel } from '@lexical/utils'
import {
  $getNearestNodeFromDOMNode,
  isHTMLElement,
  SKIP_SCROLL_INTO_VIEW_TAG,
  type NodeKey,
} from 'lexical'
import type { CSSProperties } from 'vue'
import { Teleport, defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useLexicalEditable } from './useLexicalEditable'

export type TableCellResizeDirection = 'right' | 'bottom'

export const TABLE_CELL_MIN_ROW_HEIGHT = 33
export const TABLE_CELL_MIN_COLUMN_WIDTH = 92

interface PointerPosition {
  x: number
  y: number
}

function getCellColumnIndex(cell: TableCellNode): number | undefined {
  const table = $getTableNodeFromLexicalNodeOrThrow(cell)
  const [tableMap] = $computeTableMapSkipCellCheck(table, null, null)

  for (let row = 0; row < tableMap.length; row += 1) {
    for (let column = 0; column < tableMap[row].length; column += 1) {
      if (tableMap[row][column].cell === cell) {
        return column
      }
    }
  }
}

/** Adds draggable row and column resize handles to Lexical tables. */
export const TableCellResizer = defineComponent({
  name: 'LexicalTableCellResizer',
  setup() {
    const editor = useLexicalComposer()
    const editable = useLexicalEditable()
    const mounted = ref(false)
    const hasTable = ref(false)
    const activeCell = ref<TableDOMCell | null>(null)
    const draggingDirection = ref<TableCellResizeDirection | null>(null)
    const hoveredDirection = ref<TableCellResizeDirection | null>(null)
    const pointerCurrentPosition = ref<PointerPosition | null>(null)
    const tableRect = ref<DOMRect | null>(null)
    const tableKeys = new Set<NodeKey>()
    let pointerStartPosition: PointerPosition | null = null
    let unregister: (() => void)[] = []
    let removeDocumentDragListeners: (() => void) | undefined

    const resetState = () => {
      activeCell.value = null
      draggingDirection.value = null
      hoveredDirection.value = null
      pointerCurrentPosition.value = null
      pointerStartPosition = null
      tableRect.value = null
    }

    const updateRowHeight = (heightChange: number) => {
      const cell = activeCell.value
      /* v8 ignore next -- resize handles cannot start without an active cell. */
      if (cell === null) {
        throw new Error('LexicalTableCellResizer: Expected an active table cell')
      }

      editor.update(
        () => {
          const tableCell = $getNearestNodeFromDOMNode(cell.elem)
          /* v8 ignore next -- the active DOM cell is owned by a registered TableCellNode. */
          if (!$isTableCellNode(tableCell)) {
            throw new Error('LexicalTableCellResizer: Table cell node not found')
          }

          const table = $getTableNodeFromLexicalNodeOrThrow(tableCell)
          const baseRowIndex = $getTableRowIndexFromTableCellNode(tableCell)
          const rowIndex =
            tableCell.getColSpan() === table.getColumnCount()
              ? baseRowIndex
              : baseRowIndex + tableCell.getRowSpan() - 1
          const row = table.getChildren()[rowIndex]
          /* v8 ignore next -- Lexical's table map guarantees a TableRowNode here. */
          if (!$isTableRowNode(row)) {
            throw new Error('LexicalTableCellResizer: Table row not found')
          }

          const measuredHeight = Math.min(
            ...row
              .getChildren()
              .filter($isTableCellNode)
              .map((rowCell) => editor.getElementByKey(rowCell.getKey())?.clientHeight ?? Infinity),
          )
          const height = row.getHeight() ?? measuredHeight
          row.setHeight(Math.max(height + heightChange, TABLE_CELL_MIN_ROW_HEIGHT))
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG },
      )
    }

    const updateColumnWidth = (widthChange: number) => {
      const cell = activeCell.value
      /* v8 ignore next -- resize handles cannot start without an active cell. */
      if (cell === null) {
        throw new Error('LexicalTableCellResizer: Expected an active table cell')
      }

      editor.update(
        () => {
          const tableCell = $getNearestNodeFromDOMNode(cell.elem)
          /* v8 ignore next -- the active DOM cell is owned by a registered TableCellNode. */
          if (!$isTableCellNode(tableCell)) {
            throw new Error('LexicalTableCellResizer: Table cell node not found')
          }

          const table = $getTableNodeFromLexicalNodeOrThrow(tableCell)
          const columnIndex = getCellColumnIndex(tableCell)
          const colWidths = table.getColWidths()
          /* v8 ignore next -- the transform initializes every mapped table column. */
          if (columnIndex === undefined || colWidths?.[columnIndex] === undefined) {
            return
          }

          const next = [...colWidths]
          next[columnIndex] = Math.max(next[columnIndex] + widthChange, TABLE_CELL_MIN_COLUMN_WIDTH)
          table.setColWidths(next)
        },
        { tag: SKIP_SCROLL_INTO_VIEW_TAG },
      )
    }

    const stopDragging = () => {
      removeDocumentDragListeners?.()
      removeDocumentDragListeners = undefined
    }

    const startDragging = (direction: TableCellResizeDirection, event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      /* v8 ignore next -- only a rendered active-cell handle can call this function. */
      if (activeCell.value === null) {
        throw new Error('LexicalTableCellResizer: Expected an active table cell')
      }

      pointerStartPosition = { x: event.clientX, y: event.clientY }
      pointerCurrentPosition.value = pointerStartPosition
      draggingDirection.value = direction

      const onPointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault()
        moveEvent.stopPropagation()
        pointerCurrentPosition.value = { x: moveEvent.clientX, y: moveEvent.clientY }
      }
      const onPointerUp = (upEvent: PointerEvent) => {
        upEvent.preventDefault()
        upEvent.stopPropagation()
        if (pointerStartPosition !== null) {
          const zoom = calculateZoomLevel(upEvent.target as Element)
          if (direction === 'bottom') {
            updateRowHeight((upEvent.clientY - pointerStartPosition.y) / zoom)
          } else {
            updateColumnWidth((upEvent.clientX - pointerStartPosition.x) / zoom)
          }
        }
        stopDragging()
        resetState()
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
      removeDocumentDragListeners = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
      }
    }

    const onRootPointerMove = (event: PointerEvent) => {
      const target = event.target
      /* v8 ignore next -- browser pointer events delivered by an element listener target Elements. */
      if (!isHTMLElement(target)) {
        return
      }
      if (draggingDirection.value !== null) {
        event.preventDefault()
        event.stopPropagation()
        pointerCurrentPosition.value = { x: event.clientX, y: event.clientY }
        return
      }
      const cell = getDOMCellFromTarget(target)
      if (cell === null) {
        resetState()
        return
      }

      const cellRect = cell.elem.getBoundingClientRect()
      const distanceFromRight = Math.abs(event.clientX - cellRect.right)
      const distanceFromBottom = Math.abs(event.clientY - cellRect.bottom)
      hoveredDirection.value =
        distanceFromRight <= 8 && distanceFromRight <= distanceFromBottom
          ? 'right'
          : distanceFromBottom <= 8
            ? 'bottom'
            : null

      editor.read('latest', () => {
        const tableCell = $getNearestNodeFromDOMNode(cell.elem)
        /* v8 ignore next -- getDOMCellFromTarget only returns mapped table cells. */
        if (!$isTableCellNode(tableCell)) {
          throw new Error('LexicalTableCellResizer: Table cell node not found')
        }
        const table = $getTableNodeFromLexicalNodeOrThrow(tableCell)
        const element = getTableElement(table, editor.getElementByKey(table.getKey()))
        /* v8 ignore next -- a hovered mapped cell belongs to a mounted table element. */
        if (element === null) {
          throw new Error('LexicalTableCellResizer: Table element not found')
        }
        tableRect.value = element.getBoundingClientRect()
        activeCell.value = cell
      })
    }

    const getResizerStyles = (direction: TableCellResizeDirection): CSSProperties | undefined => {
      const cell = activeCell.value
      /* v8 ignore next -- styles are requested only while the active-cell handles render. */
      if (cell === null) {
        return undefined
      }

      const rect = cell.elem.getBoundingClientRect()
      const zoneWidth = 16
      const styles: CSSProperties = {
        backgroundColor: 'transparent',
        cursor: direction === 'bottom' ? 'row-resize' : 'col-resize',
        position: 'absolute',
        zIndex: 20,
      }

      if (direction === 'bottom') {
        styles.height = `${zoneWidth}px`
        styles.left = `${window.scrollX + rect.left}px`
        styles.top = `${window.scrollY + rect.top + rect.height - zoneWidth / 2}px`
        styles.width = `${rect.width}px`
      } else {
        styles.height = `${rect.height}px`
        styles.left = `${window.scrollX + rect.left + rect.width - zoneWidth / 2}px`
        styles.top = `${window.scrollY + rect.top}px`
        styles.width = `${zoneWidth}px`
      }

      const current = pointerCurrentPosition.value
      const currentTableRect = tableRect.value
      if (draggingDirection.value === direction && current !== null && currentTableRect !== null) {
        styles.backgroundColor = '#76b6ff'
        if (direction === 'bottom') {
          styles.height = '3px'
          styles.left = `${window.scrollX + currentTableRect.left}px`
          styles.top = `${window.scrollY + current.y}px`
          styles.width = `${currentTableRect.width}px`
        } else {
          styles.height = `${currentTableRect.height}px`
          styles.left = `${window.scrollX + current.x}px`
          styles.top = `${window.scrollY + currentTableRect.top}px`
          styles.width = '3px'
        }
      } else if (hoveredDirection.value === direction) {
        styles.backgroundImage = `linear-gradient(${direction === 'right' ? '90deg' : '0deg'}, transparent 7px, #76b6ff 7px, #76b6ff 9px, transparent 9px)`
        if (currentTableRect !== null && direction === 'right') {
          styles.height = `${currentTableRect.height}px`
          styles.top = `${window.scrollY + currentTableRect.top}px`
        } else if (currentTableRect !== null) {
          styles.left = `${window.scrollX + currentTableRect.left}px`
          styles.width = `${currentTableRect.width}px`
        }
      }

      return styles
    }

    onMounted(() => {
      mounted.value = true
      unregister = [
        editor.registerMutationListener(TableNode, (mutations) => {
          for (const [key, mutation] of mutations) {
            if (mutation === 'destroyed') {
              tableKeys.delete(key)
            } else {
              tableKeys.add(key)
            }
          }
          hasTable.value = tableKeys.size > 0
          if (!hasTable.value) {
            resetState()
          }
        }),
        editor.registerNodeTransform(TableNode, (table) => {
          if (table.getColWidths() === undefined) {
            table.setColWidths(Array(table.getColumnCount()).fill(TABLE_CELL_MIN_COLUMN_WIDTH))
          }
        }),
        editor.registerRootListener((rootElement) => {
          if (rootElement === null) {
            return
          }
          rootElement.addEventListener('pointermove', onRootPointerMove)
          return () => rootElement.removeEventListener('pointermove', onRootPointerMove)
        }),
      ]
    })

    watch(editable, (isEditable) => {
      if (!isEditable) {
        stopDragging()
        resetState()
      }
    })

    onUnmounted(() => {
      mounted.value = false
      stopDragging()
      for (const remove of unregister) {
        remove()
      }
      unregister = []
    })

    const renderHandle = (direction: TableCellResizeDirection) =>
      h('div', {
        'aria-hidden': 'true',
        class: ['TableCellResizer__resizer', 'TableCellResizer__ui'],
        'data-direction': direction,
        onPointerdown: (event: PointerEvent) => startDragging(direction, event),
        onPointerenter: () => {
          if (draggingDirection.value === null) {
            hoveredDirection.value = direction
          }
        },
        onPointerleave: () => {
          if (draggingDirection.value === null) {
            hoveredDirection.value = null
          }
        },
        style: getResizerStyles(direction),
      })

    return () => {
      if (
        !mounted.value ||
        !editable.value ||
        !hasTable.value ||
        activeCell.value === null ||
        typeof document === 'undefined'
      ) {
        return null
      }

      return h(Teleport, { to: document.body }, [renderHandle('right'), renderHandle('bottom')])
    }
  },
})

export { TableCellResizer as LexicalTableCellResizer }
export default TableCellResizer
