import { $isHeadingNode, HeadingNode, type HeadingTagType } from '@lexical/rich-text'
import {
  $getRoot,
  $isElementNode,
  type EditorState,
  type ElementNode,
  type LexicalEditor,
  type NodeKey,
} from 'lexical'
import { Fragment, defineComponent, h, onMounted, onUnmounted, shallowRef } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

/** A heading key, its current text, and its heading tag. */
export type TableOfContentsEntry = [key: NodeKey, text: string, tag: HeadingTagType]

export interface TableOfContentsSlotProps {
  tableOfContents: TableOfContentsEntry[]
  editor: LexicalEditor
}

function $collectHeadings(node: ElementNode, entries: TableOfContentsEntry[]): void {
  for (const child of node.getChildren()) {
    if ($isHeadingNode(child)) {
      entries.push([child.getKey(), child.getTextContent(), child.getTag()])
    } else if ($isElementNode(child)) {
      $collectHeadings(child, entries)
    }
  }
}

function areEqual(
  current: readonly TableOfContentsEntry[],
  next: readonly TableOfContentsEntry[],
): boolean {
  return (
    current.length === next.length &&
    current.every(
      (entry, index) =>
        entry[0] === next[index][0] && entry[1] === next[index][1] && entry[2] === next[index][2],
    )
  )
}

/** Tracks all headings in document order and exposes them through the default slot. */
export const TableOfContentsPlugin = defineComponent({
  name: 'LexicalTableOfContentsPlugin',
  setup(_props, { slots }) {
    const editor = useLexicalComposer()
    const tableOfContents = shallowRef<TableOfContentsEntry[]>([])
    let unregister: (() => void) | undefined

    const updateTableOfContents = (editorState: EditorState) => {
      const next = editorState.read(() => {
        const entries: TableOfContentsEntry[] = []
        $collectHeadings($getRoot(), entries)
        return entries
      })

      if (!areEqual(tableOfContents.value, next)) {
        tableOfContents.value = next
      }
    }

    onMounted(() => {
      if (!editor.hasNodes([HeadingNode])) {
        throw new Error(
          'LexicalTableOfContentsPlugin: HeadingNode must be registered on the editor',
        )
      }

      updateTableOfContents(editor.getEditorState())
      unregister = editor.registerUpdateListener(({ editorState }) => {
        updateTableOfContents(editorState)
      })
    })
    onUnmounted(() => unregister?.())

    return () =>
      h(
        Fragment,
        null,
        slots.default?.({
          editor,
          tableOfContents: tableOfContents.value,
        } satisfies TableOfContentsSlotProps),
      )
  },
})

export { TableOfContentsPlugin as LexicalTableOfContentsPlugin }
export default TableOfContentsPlugin
