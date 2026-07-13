import { eventFiles } from '@lexical/rich-text'
import { calculateZoomLevel } from '@lexical/utils'
import type { LexicalEditor } from 'lexical'
import type { PropType, ShallowRef } from 'vue'
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  getComposedEventTarget,
  isHTMLElement,
  mergeRegister,
  registerEventListeners,
} from 'lexical'
import { Teleport, defineComponent, h, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { useLexicalEditable } from './useLexicalEditable'

const HANDLE_LEFT = 4
const TARGET_LINE_HALF_HEIGHT = 2
const TARGET_LINE_PADDING = 24
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block'

export interface DraggableBlockSlotProps {
  blockElement: HTMLElement | null
}

export interface DraggableBlockPluginProps {
  anchorElement?: HTMLElement | null
  isOnMenu?: (element: HTMLElement) => boolean
  onElementChanged?: (element: HTMLElement | null) => void
}

function numberStyle(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function getCollapsedMargins(element: HTMLElement): { marginBottom: number; marginTop: number } {
  const view = element.ownerDocument.defaultView
  const style = view?.getComputedStyle(element)
  const previous = element.previousElementSibling
  const next = element.nextElementSibling
  const previousMargin =
    previous === null ? 0 : numberStyle(view?.getComputedStyle(previous).marginBottom ?? '0')
  const nextMargin = next === null ? 0 : numberStyle(view?.getComputedStyle(next).marginTop ?? '0')

  return {
    marginBottom: Math.max(numberStyle(style?.marginBottom ?? '0'), nextMargin),
    marginTop: Math.max(numberStyle(style?.marginTop ?? '0'), previousMargin),
  }
}

function getTopLevelElements(editor: LexicalEditor): HTMLElement[] {
  return editor.read('latest', () =>
    $getRoot()
      .getChildrenKeys()
      .map((key) => editor.getElementByKey(key))
      .filter((element): element is HTMLElement => element !== null),
  )
}

function getBlockElement(
  editor: LexicalEditor,
  event: MouseEvent | DragEvent,
  useEdgeAsDefault = false,
): HTMLElement | null {
  const elements = getTopLevelElements(editor)
  if (elements.length === 0) {
    return null
  }

  for (const element of elements) {
    const zoom = calculateZoomLevel(element)
    const rect = element.getBoundingClientRect()
    const { marginBottom, marginTop } = getCollapsedMargins(element)
    const pointerY = event.clientY / zoom
    if (pointerY >= rect.top - marginTop && pointerY <= rect.bottom + marginBottom) {
      return element
    }
  }

  if (useEdgeAsDefault) {
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (event.clientY / calculateZoomLevel(first) < first.getBoundingClientRect().top) {
      return first
    }
    if (event.clientY / calculateZoomLevel(last) > last.getBoundingClientRect().bottom) {
      return last
    }
  }

  return null
}

function hideElement(element: HTMLElement | null): void {
  if (element !== null) {
    element.style.opacity = '0'
    element.style.transform = 'translate(-10000px, -10000px)'
  }
}

function positionMenu(
  block: HTMLElement | null,
  menu: HTMLElement | null,
  anchor: HTMLElement | null,
): void {
  if (block === null || menu === null || anchor === null) {
    hideElement(menu)
    return
  }

  const blockRect = block.getBoundingClientRect()
  const menuRect = menu.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  const view = block.ownerDocument.defaultView
  const lineHeight =
    view === null ? Number.NaN : numberStyle(view.getComputedStyle(block).lineHeight)
  const blockHeight = blockRect.bottom - blockRect.top
  const effectiveHeight = lineHeight > 0 ? lineHeight : blockHeight
  const top =
    blockRect.top +
    (effectiveHeight - (menuRect.height || effectiveHeight)) / 2 -
    anchorRect.top +
    anchor.scrollTop

  menu.style.opacity = '1'
  menu.style.transform = `translate(${HANDLE_LEFT}px, ${top}px)`
}

function positionTargetLine(
  line: HTMLElement,
  block: HTMLElement,
  pointerY: number,
  anchor: HTMLElement,
): void {
  const blockRect = block.getBoundingClientRect()
  const anchorRect = anchor.getBoundingClientRect()
  const { marginBottom, marginTop } = getCollapsedMargins(block)
  const lineY =
    pointerY >= blockRect.top ? blockRect.bottom + marginBottom / 2 : blockRect.top - marginTop / 2
  const top = lineY - anchorRect.top - TARGET_LINE_HALF_HEIGHT + anchor.scrollTop

  line.style.opacity = '0.4'
  line.style.transform = `translate(${TARGET_LINE_PADDING}px, ${top}px)`
  line.style.width = `${Math.max(0, anchorRect.width - TARGET_LINE_PADDING * 2)}px`
}

function useAnchorElement(
  editor: LexicalEditor,
  anchorProp: () => HTMLElement | null | undefined,
): ShallowRef<HTMLElement | null> {
  const anchor = shallowRef<HTMLElement | null>(null)
  let unregisterRoot: (() => void) | undefined
  let stopWatching: (() => void) | undefined

  onMounted(() => {
    const updateAnchor = () => {
      const root = editor.getRootElement()
      anchor.value = anchorProp() ?? root?.parentElement ?? root?.ownerDocument.body ?? null
    }
    unregisterRoot = editor.registerRootListener(updateAnchor)
    stopWatching = watch(anchorProp, updateAnchor)
    updateAnchor()
  })
  onUnmounted(() => {
    unregisterRoot?.()
    stopWatching?.()
  })

  return anchor
}

/** Reorders top-level blocks with a Teleported Vue drag handle and target line. */
export const DraggableBlockPlugin = defineComponent({
  name: 'LexicalDraggableBlockPlugin',
  props: {
    anchorElement: {
      type: Object as PropType<HTMLElement | null>,
      default: null,
    },
    isOnMenu: {
      type: Function as PropType<(element: HTMLElement) => boolean>,
      default: undefined,
    },
    onElementChanged: {
      type: Function as PropType<(element: HTMLElement | null) => void>,
      default: undefined,
    },
  },
  emits: {
    'element-change': (_element: HTMLElement | null) => true,
  },
  setup(props, { emit, slots }) {
    const editor = useLexicalComposer()
    const editable = useLexicalEditable()
    const anchor = useAnchorElement(editor, () => props.anchorElement)
    const menu = shallowRef<HTMLElement | null>(null)
    const targetLine = shallowRef<HTMLElement | null>(null)
    const blockElement = shallowRef<HTMLElement | null>(null)
    let dragging = false
    let unregisterCommands: (() => void) | undefined
    let stopWatchingAnchor: (() => void) | undefined

    const setBlockElement = (element: HTMLElement | null) => {
      if (blockElement.value !== element) {
        blockElement.value = element
        props.onElementChanged?.(element)
        emit('element-change', element)
      }
      positionMenu(element, menu.value, anchor.value)
    }

    const isMenuElement = (element: HTMLElement) =>
      props.isOnMenu?.(element) ?? menu.value?.contains(element) === true

    const onMouseMove = (event: MouseEvent) => {
      const target = getComposedEventTarget(event)
      if (!isHTMLElement(target)) {
        setBlockElement(null)
      } else if (!isMenuElement(target)) {
        setBlockElement(getBlockElement(editor, event))
      }
    }

    const onMouseLeave = () => setBlockElement(null)

    onMounted(() => {
      stopWatchingAnchor = watch(
        anchor,
        (element, _previous, onCleanup) => {
          if (element !== null) {
            onCleanup(
              registerEventListeners(element, {
                mouseleave: onMouseLeave,
                mousemove: onMouseMove,
              }),
            )
          }
        },
        { immediate: true },
      )

      unregisterCommands = mergeRegister(
        editor.registerCommand(
          DRAGOVER_COMMAND,
          (event) => {
            if (!dragging || eventFiles(event)[0]) {
              return false
            }
            const target = getComposedEventTarget(event)
            const block = getBlockElement(editor, event, true)
            if (
              !isHTMLElement(target) ||
              block === null ||
              targetLine.value === null ||
              anchor.value === null
            ) {
              return false
            }

            positionTargetLine(
              targetLine.value,
              block,
              event.clientY / calculateZoomLevel(target),
              anchor.value,
            )
            event.preventDefault()
            return true
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          DROP_COMMAND,
          (event) => {
            if (!dragging || eventFiles(event)[0]) {
              return false
            }
            const target = getComposedEventTarget(event)
            const dragKey = event.dataTransfer?.getData(DRAG_DATA_FORMAT) ?? ''
            const draggedNode = $getNodeByKey(dragKey)
            const block = getBlockElement(editor, event, true)
            if (!isHTMLElement(target) || draggedNode === null || block === null) {
              return false
            }

            const targetNode = $getNearestNodeFromDOMNode(block)
            if (targetNode === null) {
              return false
            }
            if (targetNode !== draggedNode) {
              if (event.clientY / calculateZoomLevel(target) >= block.getBoundingClientRect().top) {
                targetNode.insertAfter(draggedNode)
              } else {
                targetNode.insertBefore(draggedNode)
              }
            }

            setBlockElement(null)
            hideElement(targetLine.value)
            return true
          },
          COMMAND_PRIORITY_HIGH,
        ),
      )
    })
    onUnmounted(() => {
      unregisterCommands?.()
      stopWatchingAnchor?.()
    })

    const onDragStart = (event: DragEvent) => {
      if (event.dataTransfer === null || blockElement.value === null) {
        return
      }

      const draggedElement = blockElement.value
      const key = editor.read('latest', () => $getNearestNodeFromDOMNode(draggedElement)?.getKey())
      if (key === undefined) {
        return
      }

      event.dataTransfer.setDragImage(draggedElement, 0, 0)
      event.dataTransfer.setData(DRAG_DATA_FORMAT, key)
      dragging = true
    }

    const onDragEnd = () => {
      dragging = false
      hideElement(targetLine.value)
    }

    return () => {
      if (anchor.value === null) {
        return null
      }

      const slotProps: DraggableBlockSlotProps = { blockElement: blockElement.value }
      return h(Teleport, { to: anchor.value }, [
        h(
          'div',
          {
            draggable: editable.value,
            onDragend: onDragEnd,
            onDragstart: onDragStart,
            ref: menu,
            style: {
              left: 0,
              opacity: blockElement.value === null ? 0 : 1,
              position: 'absolute',
              top: 0,
            },
          },
          editable.value ? slots.menu?.(slotProps) : [],
        ),
        h(
          'div',
          {
            'aria-hidden': 'true',
            ref: targetLine,
            style: { left: 0, opacity: 0, position: 'absolute', top: 0 },
          },
          slots.targetLine?.(slotProps),
        ),
      ])
    }
  },
})

export { DraggableBlockPlugin as DraggableBlockPlugin_EXPERIMENTAL }
export { DraggableBlockPlugin as LexicalDraggableBlockPlugin }
export default DraggableBlockPlugin
