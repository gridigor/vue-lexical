import { generateContent } from '@lexical/devtools-core'
import type {
  EditorState,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  SerializedEditorState,
  SerializedLexicalNode,
} from 'lexical'
import { COMMAND_PRIORITY_CRITICAL } from 'lexical'
import type { ComponentPublicInstance, PropType } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, ref, shallowRef, toRaw, watch } from 'vue'

export type CustomPrintNodeFn = (node: LexicalNode, obfuscateText?: boolean) => string | undefined

export type LexicalCommandEntry = { index: number } & LexicalCommand<unknown> & {
    payload: unknown
  }

export type LexicalCommandLog = readonly LexicalCommandEntry[]

export interface TreeViewProps {
  editor: LexicalEditor
  treeTypeButtonClassName?: string
  timeTravelButtonClassName?: string
  timeTravelPanelButtonClassName?: string
  timeTravelPanelClassName?: string
  timeTravelPanelSliderClassName?: string
  viewClassName?: string
  customPrintNode?: CustomPrintNodeFn
}

type SerializedNodeWithChildren = SerializedLexicalNode & {
  children?: SerializedNodeWithChildren[]
  text?: string
}

type TimeStampedEditorState = readonly [number, EditorState]

type TreeViewElement = HTMLPreElement & {
  __lexicalEditor?: LexicalEditor | null
}

const LARGE_EDITOR_STATE_SIZE = 1000

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

/**
 * Generates the lightweight tree/JSON output used by earlier releases. For the
 * complete devtools output, render {@link TreeView} instead.
 */
export function generateTreeViewContent(editorState: EditorState, asJson = false): string {
  const serialized = editorState.toJSON() as SerializedEditorState<SerializedNodeWithChildren>
  return asJson ? JSON.stringify(serialized, null, 2) : printNode(serialized.root).join('\n')
}

function formatTreeViewError(error: unknown): string {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return `Error rendering tree: ${normalized.message}\n\nStack:\n${normalized.stack ?? ''}`
}

function registerLexicalCommandLogger(
  editor: LexicalEditor,
  setLoggedCommands: (update: (current: LexicalCommandLog) => LexicalCommandLog) => void,
): () => void {
  const unregisterCommandListeners: (() => void)[] = []
  let index = 0
  for (const command of editor._commands.keys()) {
    unregisterCommandListeners.push(
      editor.registerCommand(
        command,
        (payload) => {
          index += 1
          const entry: LexicalCommandEntry = {
            index,
            payload,
            type: command.type || 'UNKNOWN',
          }
          setLoggedCommands((state) => [...state.slice(-9), entry])
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  }
  return () => unregisterCommandListeners.forEach((unregister) => unregister())
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
    timeTravelButtonClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelButtonClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelSliderClassName: {
      type: String,
      default: undefined,
    },
    viewClassName: {
      type: String,
      default: undefined,
    },
    customPrintNode: {
      type: Function as PropType<CustomPrintNodeFn>,
      default: undefined,
    },
  },
  setup(props) {
    const getEditor = () => toRaw(props.editor)
    const editorState = shallowRef(getEditor().getEditorState())
    const commandsLog = shallowRef<LexicalCommandLog>([])
    const timeStampedEditorStates = shallowRef<TimeStampedEditorState[]>([])
    const content = ref('')
    const timeTravelEnabled = ref(false)
    const showExportDOM = ref(false)
    const playingIndex = ref(0)
    const sliderElement = shallowRef<HTMLInputElement | null>(null)
    const isPlaying = ref(false)
    const isLimited = ref(false)
    const showLimited = ref(false)
    let treeElement: TreeViewElement | null = null
    let unregisterEditor: (() => void) | undefined
    let playbackTimeout: ReturnType<typeof setTimeout> | undefined
    let lastEditorState: EditorState | null = null
    let generationId = 0

    const setTreeElement = (value: Element | ComponentPublicInstance | null) => {
      if (treeElement !== null) {
        treeElement.__lexicalEditor = null
      }
      treeElement = value instanceof HTMLPreElement ? value : null
      if (treeElement !== null) {
        treeElement.__lexicalEditor = getEditor()
      }
    }

    const generateTree = (exportDOM: boolean) => {
      const currentGenerationId = ++generationId
      Promise.resolve()
        .then(() =>
          generateContent(getEditor(), commandsLog.value, exportDOM, props.customPrintNode),
        )
        .then((treeText) => {
          if (currentGenerationId === generationId) {
            content.value = treeText
          }
        })
        .catch((error: unknown) => {
          if (currentGenerationId === generationId) {
            content.value = formatTreeViewError(error)
          }
        })
    }

    const updateTree = () => {
      if (!showLimited.value && editorState.value._nodeMap.size > LARGE_EDITOR_STATE_SIZE) {
        isLimited.value = true
        return
      }

      const isEditorStateChange = lastEditorState !== editorState.value
      lastEditorState = editorState.value
      generateTree(showExportDOM.value)

      if (!timeTravelEnabled.value && isEditorStateChange) {
        timeStampedEditorStates.value = [
          ...timeStampedEditorStates.value,
          [Date.now(), editorState.value],
        ]
      }
    }

    const stopPlayback = () => {
      if (playbackTimeout !== undefined) {
        clearTimeout(playbackTimeout)
        playbackTimeout = undefined
      }
      isPlaying.value = false
    }

    const play = () => {
      const currentIndex = playingIndex.value
      if (currentIndex === timeStampedEditorStates.value.length - 1) {
        stopPlayback()
        return
      }

      const current = timeStampedEditorStates.value[currentIndex]!
      const next = timeStampedEditorStates.value[currentIndex + 1]!

      playbackTimeout = setTimeout(() => {
        playingIndex.value += 1
        if (sliderElement.value !== null) {
          sliderElement.value.value = String(playingIndex.value)
        }
        const state = timeStampedEditorStates.value[playingIndex.value]!
        getEditor().setEditorState(state[1])
        play()
      }, next[0] - current[0])
    }

    const togglePlayback = () => {
      if (playingIndex.value === timeStampedEditorStates.value.length - 1) {
        playingIndex.value = 1
      }
      if (isPlaying.value) {
        stopPlayback()
      } else {
        isPlaying.value = true
        play()
      }
    }

    const connectEditor = (editor: LexicalEditor) => {
      editorState.value = editor.getEditorState()
      commandsLog.value = []
      unregisterEditor = (() => {
        const unregisterUpdate = editor.registerUpdateListener(({ editorState: nextState }) => {
          editorState.value = nextState
        })
        const unregisterEditable = editor.registerEditableListener(() => {
          editorState.value = editor.getEditorState()
        })
        const unregisterCommands = registerLexicalCommandLogger(editor, (update) => {
          commandsLog.value = update(commandsLog.value)
        })
        return () => {
          unregisterUpdate()
          unregisterEditable()
          unregisterCommands()
        }
      })()
    }

    watch([editorState, commandsLog], updateTree, { immediate: true })
    watch(showLimited, (isShown) => {
      if (isShown) {
        updateTree()
      }
    })
    watch(
      () => props.editor,
      (editor) => {
        const rawEditor = toRaw(editor)
        if (treeElement !== null) {
          treeElement.__lexicalEditor = rawEditor
        }
        unregisterEditor?.()
        connectEditor(rawEditor)
      },
    )

    onMounted(() => {
      connectEditor(getEditor())
    })

    onUnmounted(() => {
      generationId += 1
      stopPlayback()
      unregisterEditor?.()
      setTreeElement(null)
    })

    const showFullTree = () => {
      showLimited.value = true
    }

    const toggleExportMode = () => {
      showExportDOM.value = !showExportDOM.value
      generateTree(showExportDOM.value)
    }

    const enterTimeTravel = () => {
      const rootElement = getEditor().getRootElement()
      if (rootElement !== null) {
        rootElement.contentEditable = 'false'
      }
      playingIndex.value = timeStampedEditorStates.value.length - 1
      timeTravelEnabled.value = true
    }

    const selectEditorState = (event: Event) => {
      const editorStateIndex = Number((event.target as HTMLInputElement).value)
      const state = timeStampedEditorStates.value[editorStateIndex]
      if (state !== undefined) {
        playingIndex.value = editorStateIndex
        getEditor().setEditorState(state[1])
      }
    }

    const exitTimeTravel = () => {
      const rootElement = getEditor().getRootElement()
      if (rootElement !== null) {
        rootElement.contentEditable = 'true'
      }
      const index = timeStampedEditorStates.value.length - 1
      const state = timeStampedEditorStates.value[index]
      if (state !== undefined) {
        getEditor().setEditorState(state[1])
      }
      if (sliderElement.value !== null) {
        sliderElement.value.value = String(index)
      }
      timeTravelEnabled.value = false
      stopPlayback()
    }

    return () => {
      const canShowTree = showLimited.value || !isLimited.value
      return h('div', { class: props.viewClassName }, [
        !showLimited.value && isLimited.value
          ? h('div', { style: { padding: '20px' } }, [
              h(
                'span',
                { style: { marginRight: '20px' } },
                'Detected large EditorState, this can impact debugging performance.',
              ),
              h(
                'button',
                {
                  onClick: showFullTree,
                  style: {
                    background: 'transparent',
                    border: '1px solid white',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '5px',
                  },
                  type: 'button',
                },
                'Show full tree',
              ),
            ])
          : null,
        !showLimited.value
          ? h(
              'button',
              {
                class: props.treeTypeButtonClassName,
                onClick: toggleExportMode,
                type: 'button',
              },
              showExportDOM.value ? 'Tree' : 'Export DOM',
            )
          : null,
        !timeTravelEnabled.value && canShowTree && timeStampedEditorStates.value.length > 2
          ? h(
              'button',
              {
                class: props.timeTravelButtonClassName,
                onClick: enterTimeTravel,
                type: 'button',
              },
              'Time Travel',
            )
          : null,
        canShowTree ? h('pre', { ref: setTreeElement }, content.value) : null,
        timeTravelEnabled.value && canShowTree
          ? h('div', { class: props.timeTravelPanelClassName }, [
              h(
                'button',
                {
                  class: props.timeTravelPanelButtonClassName,
                  onClick: togglePlayback,
                  type: 'button',
                },
                isPlaying.value ? 'Pause' : 'Play',
              ),
              h('input', {
                class: props.timeTravelPanelSliderClassName,
                max: timeStampedEditorStates.value.length - 1,
                min: 1,
                onChange: selectEditorState,
                ref: sliderElement,
                type: 'range',
              }),
              h(
                'button',
                {
                  class: props.timeTravelPanelButtonClassName,
                  onClick: exitTimeTravel,
                  type: 'button',
                },
                'Exit',
              ),
            ])
          : null,
      ])
    }
  },
})

export { TreeView as LexicalTreeView }
export default TreeView
