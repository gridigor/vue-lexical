import type {
  EditorState,
  LexicalEditor,
  SerializedEditorState,
  SerializedLexicalNode,
} from 'lexical'
import type { PropType } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, ref, shallowRef } from 'vue'

export interface TreeViewProps {
  editor: LexicalEditor
  treeTypeButtonClassName?: string
  viewClassName?: string
}

type SerializedNodeWithChildren = SerializedLexicalNode & {
  children?: SerializedNodeWithChildren[]
  text?: string
}

function printNode(node: SerializedNodeWithChildren, prefix = '', isLast = true): string[] {
  const marker = prefix === '' ? '' : isLast ? '└ ' : '├ '
  const text = node.text === undefined ? '' : ` "${node.text}"`
  const lines = [`${prefix}${marker}${node.type}${text}`]
  const children = node.children ?? []
  const childPrefix = prefix === '' ? '  ' : `${prefix}${isLast ? '  ' : '│ '}`

  children.forEach((child, index) => {
    lines.push(...printNode(child, childPrefix, index === children.length - 1))
  })
  return lines
}

export function generateTreeViewContent(editorState: EditorState, asJson = false): string {
  const serialized = editorState.toJSON() as SerializedEditorState<SerializedNodeWithChildren>
  return asJson ? JSON.stringify(serialized, null, 2) : printNode(serialized.root).join('\n')
}

export const TreeView = defineComponent({
  name: 'LexicalTreeView',
  props: {
    editor: {
      type: Object as PropType<LexicalEditor>,
      required: true,
    },
    treeTypeButtonClassName: {
      type: String,
      default: undefined,
    },
    viewClassName: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const editorState = shallowRef(props.editor.getEditorState())
    const showJson = ref(false)
    let unregisterUpdate: (() => void) | undefined
    let unregisterEditable: (() => void) | undefined

    onMounted(() => {
      unregisterUpdate = props.editor.registerUpdateListener(({ editorState: nextEditorState }) => {
        editorState.value = nextEditorState
      })
      unregisterEditable = props.editor.registerEditableListener(() => {
        editorState.value = props.editor.getEditorState()
      })
      editorState.value = props.editor.getEditorState()
    })

    onUnmounted(() => {
      unregisterUpdate?.()
      unregisterEditable?.()
    })

    return () =>
      h('div', { class: props.viewClassName }, [
        h(
          'button',
          {
            class: props.treeTypeButtonClassName,
            onClick: () => {
              showJson.value = !showJson.value
            },
            type: 'button',
          },
          showJson.value ? 'Tree' : 'JSON',
        ),
        h('pre', generateTreeViewContent(editorState.value, showJson.value)),
      ])
  },
})

export { TreeView as LexicalTreeView }
export default TreeView
