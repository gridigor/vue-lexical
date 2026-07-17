import { signal } from '@lexical/extension'
import {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isScrollableTablesActive,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  getDOMCellFromTarget,
  INSERT_TABLE_COMMAND,
  registerTableCellUnmergeTransform,
  registerTablePlugin,
  registerTableSelectionObserver,
  setScrollableTablesActive,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table'
import { $fullReconcile, getComposedEventTarget, isDOMNode, type LexicalEditor } from 'lexical'
import type { WatchStopHandle } from 'vue'
import { defineComponent, onMounted, onUnmounted, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export interface TablePluginProps {
  /** Keep merged cells (`colspan` and `rowspan`) enabled. */
  hasCellMerge?: boolean
  /** Preserve background colors stored on table cells. */
  hasCellBackgroundColor?: boolean
  /** Use Tab and Shift+Tab to navigate between table cells. */
  hasTabHandler?: boolean
  /** Wrap tables in the theme's horizontally scrollable container. */
  hasHorizontalScroll?: boolean
  /** Allow tables to be inserted inside table cells. Experimental in Lexical. */
  hasNestedTables?: boolean
}

function registerTablePointerSelectionGuard(editor: LexicalEditor): () => void {
  let removeWindowListeners: (() => void) | undefined
  const unregisterRoot = editor.registerRootListener((rootElement) => {
    removeWindowListeners?.()
    removeWindowListeners = undefined
    const editorWindow = rootElement?.ownerDocument.defaultView
    if (rootElement === null || editorWindow == null) {
      return
    }

    let isTablePointerDown = false
    const stopTablePointer = () => {
      isTablePointerDown = false
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = getComposedEventTarget(event)
      isTablePointerDown =
        event.button === 0 &&
        event.pointerType !== 'touch' &&
        isDOMNode(target) &&
        rootElement.contains(target) &&
        getDOMCellFromTarget(target) !== null
    }
    const onPointerMove = (event: PointerEvent) => {
      if (isTablePointerDown && event.buttons === 1) {
        event.preventDefault()
      }
    }

    editorWindow.addEventListener('pointerdown', onPointerDown)
    editorWindow.addEventListener('pointermove', onPointerMove)
    editorWindow.addEventListener('pointerup', stopTablePointer)
    editorWindow.addEventListener('pointercancel', stopTablePointer)
    removeWindowListeners = () => {
      editorWindow.removeEventListener('pointerdown', onPointerDown)
      editorWindow.removeEventListener('pointermove', onPointerMove)
      editorWindow.removeEventListener('pointerup', stopTablePointer)
      editorWindow.removeEventListener('pointercancel', stopTablePointer)
    }
  })

  return () => {
    unregisterRoot()
    removeWindowListeners?.()
  }
}

/** Enables Lexical table commands, integrity transforms, and table selection. */
export const TablePlugin = defineComponent({
  name: 'LexicalTablePlugin',
  props: {
    hasCellMerge: {
      type: Boolean,
      default: true,
    },
    hasCellBackgroundColor: {
      type: Boolean,
      default: true,
    },
    hasTabHandler: {
      type: Boolean,
      default: true,
    },
    hasHorizontalScroll: {
      type: Boolean,
      default: false,
    },
    hasNestedTables: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    const hasNestedTables = signal(props.hasNestedTables)
    const stopHandles: WatchStopHandle[] = []
    let unregisterTablePlugin: (() => void) | undefined

    onMounted(() => {
      if (!editor.hasNodes([TableNode, TableRowNode, TableCellNode])) {
        throw new Error(
          'LexicalTablePlugin: TableNode, TableRowNode, and TableCellNode must be registered on the editor',
        )
      }

      unregisterTablePlugin = registerTablePlugin(editor, { hasNestedTables })

      stopHandles.push(
        registerTablePointerSelectionGuard(editor),
        watch(
          () => props.hasNestedTables,
          (value) => {
            hasNestedTables.value = value
          },
          { immediate: true },
        ),
        watch(
          () => props.hasTabHandler,
          (hasTabHandler, _previous, onCleanup) => {
            onCleanup(registerTableSelectionObserver(editor, hasTabHandler))
          },
          { immediate: true },
        ),
        watch(
          () => props.hasCellMerge,
          (hasCellMerge, _previous, onCleanup) => {
            if (!hasCellMerge) {
              onCleanup(registerTableCellUnmergeTransform(editor))
            }
          },
          { immediate: true },
        ),
        watch(
          () => props.hasCellBackgroundColor,
          (hasCellBackgroundColor, _previous, onCleanup) => {
            if (!hasCellBackgroundColor) {
              onCleanup(
                editor.registerNodeTransform(TableCellNode, (node) => {
                  if (node.getBackgroundColor() !== null) {
                    node.setBackgroundColor(null)
                  }
                }),
              )
            }
          },
          { immediate: true },
        ),
        watch(
          () => props.hasHorizontalScroll,
          (hasHorizontalScroll) => {
            if ($isScrollableTablesActive(editor) !== hasHorizontalScroll) {
              setScrollableTablesActive(editor, hasHorizontalScroll)
              editor.update($fullReconcile)
            }
          },
          { immediate: true },
        ),
      )
    })

    onUnmounted(() => {
      for (const stop of stopHandles) {
        stop()
      }
      unregisterTablePlugin?.()
    })

    return () => null
  },
})

export {
  $createTableCellNode,
  $createTableNode,
  $createTableNodeWithDimensions,
  $createTableRowNode,
  $isScrollableTablesActive,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  INSERT_TABLE_COMMAND,
  setScrollableTablesActive,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
}
export type { InsertTableCommandPayload, InsertTableCommandPayloadHeaders } from '@lexical/table'
export { TablePlugin as LexicalTablePlugin }
export default TablePlugin
