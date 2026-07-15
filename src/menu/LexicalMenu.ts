import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  getDOMSelection,
  getDOMSelectionPoints,
  getDOMShadowRoots,
  mergeRegister,
  registerEventListener,
  type LexicalEditor,
  type RangeSelection,
  type TextNode,
} from 'lexical'
import { getScrollParent } from '@lexical/utils'
import type { MaybeRefOrGetter, VNodeChild, WatchStopHandle } from 'vue'
import { onUnmounted, toValue, watch } from 'vue'
import { useLexicalComposer } from '../LexicalComposerContext'

export interface MenuTextMatch {
  leadOffset: number
  matchingString: string
  replaceableString: string
}

export interface MenuResolution {
  getRect: () => DOMRect
  match?: MenuTextMatch
}

export interface MenuOptionRef {
  current: HTMLElement | null
}

/** Base class for options shared by typeahead and node menus. */
export class MenuOption {
  key: string
  ref: MenuOptionRef
  icon?: VNodeChild
  title?: VNodeChild

  constructor(key: string) {
    this.key = key
    this.ref = { current: null }
    this.setRefElement = this.setRefElement.bind(this)
  }

  setRefElement(element: Element | null): void {
    this.ref = { current: element instanceof HTMLElement ? element : null }
  }
}

export interface MenuSlotProps<TOption extends MenuOption = MenuOption> {
  anchorElement: HTMLElement
  matchingString: string
  options: readonly TOption[]
  selectedIndex: number | null
  selectOptionAndCleanUp: (option: TOption) => void
  setHighlightedIndex: (index: number) => void
}

export type TriggerFn = (text: string, editor: LexicalEditor) => MenuTextMatch | null

export function getTextUpToAnchor(selection: RangeSelection): string | null {
  if (selection.anchor.type !== 'text') {
    return null
  }
  const node = selection.anchor.getNode()
  if (!node.isSimpleText()) {
    return null
  }
  return node.getTextContent().slice(0, selection.anchor.offset)
}

export function getQueryTextForSearch(editor: LexicalEditor): string | null {
  return editor.getEditorState().read(() => {
    const selection = $getSelection()
    return $isRangeSelection(selection) ? getTextUpToAnchor(selection) : null
  })
}

export function isSelectionOnEntityBoundary(editor: LexicalEditor, offset: number): boolean {
  if (offset !== 0) {
    return false
  }
  return editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection) || selection.anchor.type !== 'text') {
      return false
    }
    const previous = selection.anchor.getNode().getPreviousSibling()
    return $isTextNode(previous) && previous.isTextEntity()
  })
}

export function tryToPositionRange(
  leadOffset: number,
  range: Range,
  editorWindow: Window,
  rootElement: HTMLElement | null,
): boolean {
  const selection = getDOMSelection(editorWindow)
  if (selection === null || !selection.isCollapsed) {
    return false
  }
  const points = getDOMSelectionPoints(selection, rootElement)
  if (points.anchorNode === null || points.anchorOffset === null) {
    return false
  }
  try {
    range.setStart(points.anchorNode, leadOffset)
    range.setEnd(points.anchorNode, points.anchorOffset)
    return true
  } catch {
    return false
  }
}

function getFullMatchOffset(documentText: string, entryText: string, offset: number): number {
  let triggerOffset = offset
  for (let index = triggerOffset; index <= entryText.length; index += 1) {
    if (documentText.slice(-index) === entryText.substring(0, index)) {
      triggerOffset = index
    }
  }
  return triggerOffset
}

export function $splitNodeContainingQuery(match: MenuTextMatch): TextNode | null {
  const selection = $getSelection()
  if (
    !$isRangeSelection(selection) ||
    !selection.isCollapsed() ||
    selection.anchor.type !== 'text'
  ) {
    return null
  }

  const anchorNode = selection.anchor.getNode()
  if (!anchorNode.isSimpleText()) {
    return null
  }

  const selectionOffset = selection.anchor.offset
  const textContent = anchorNode.getTextContent().slice(0, selectionOffset)
  const queryOffset = getFullMatchOffset(
    textContent,
    match.matchingString,
    match.replaceableString.length,
  )
  const startOffset = selectionOffset - queryOffset
  if (startOffset < 0) {
    return null
  }

  if (startOffset === 0) {
    return anchorNode.splitText(selectionOffset)[0] ?? null
  }
  return anchorNode.splitText(startOffset, selectionOffset)[1] ?? null
}

export function setMenuAnchorAttributes(element: HTMLElement, className?: string): void {
  element.className = className ?? ''
  element.setAttribute('aria-label', 'Typeahead menu')
  element.setAttribute('role', 'listbox')
  Object.assign(element.style, {
    display: 'block',
    position: 'absolute',
  })
}

export function positionMenuAnchor(
  anchor: HTMLElement,
  resolution: MenuResolution,
  editor: LexicalEditor,
  includePageYOffset = true,
): void {
  const root = editor.getRootElement()
  if (root === null) {
    return
  }

  const rect = resolution.getRect()
  const pageXOffset = window.pageXOffset
  const pageYOffset = includePageYOffset ? window.pageYOffset : 0
  anchor.style.left = `${rect.left + pageXOffset}px`
  anchor.style.top = `${rect.top + anchor.offsetHeight + 3 + pageYOffset}px`
  anchor.style.width = `${rect.width}px`
  anchor.style.height = `${rect.height}px`

  const menu = anchor.firstElementChild as HTMLElement | null
  if (menu === null) {
    return
  }

  const menuRect = menu.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  if (rect.left + menuRect.width > rootRect.right) {
    anchor.style.left = `${rootRect.right - menuRect.width + pageXOffset}px`
  }
  if (
    (rect.top + menuRect.height > window.innerHeight ||
      rect.top + menuRect.height > rootRect.bottom) &&
    rect.top - rootRect.top > menuRect.height + rect.height
  ) {
    anchor.style.top = `${rect.top - menuRect.height - rect.height + pageYOffset}px`
  }
}

export function scrollIntoViewIfNeeded(target: HTMLElement): boolean {
  const container = target.closest<HTMLElement>('#typeahead-menu')
  if (container === null) {
    return false
  }

  const rect = container.getBoundingClientRect()
  if (rect.top + rect.height > window.innerHeight || rect.top < 0) {
    container.scrollIntoView({ block: 'center' })
  }
  target.scrollIntoView({ block: 'nearest' })
  return true
}

export function isTriggerVisible(target: HTMLElement, container: HTMLElement): boolean {
  const targetRect = target.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const margin = 6
  return (
    targetRect.top >= containerRect.top - margin && targetRect.top <= containerRect.bottom + margin
  )
}

/** Keeps an open menu aligned while its target or surrounding viewport moves. */
export function useDynamicPositioning(
  resolution: MaybeRefOrGetter<MenuResolution | null>,
  targetElement: MaybeRefOrGetter<HTMLElement | null>,
  onReposition: () => void,
  onVisibilityChange?: (isInView: boolean) => void,
): void {
  const editor = useLexicalComposer()
  let stopWatch: WatchStopHandle | undefined

  stopWatch = watch(
    [() => toValue(resolution), () => toValue(targetElement)],
    ([currentResolution, currentTarget], _previous, onCleanup) => {
      if (currentResolution === null || currentTarget === null) {
        return
      }

      const rootElement = editor.getRootElement()
      const rootScrollParent = rootElement
        ? getScrollParent(rootElement, false)
        : currentTarget.ownerDocument.body
      let ticking = false
      let animationFrame = 0
      let previousIsInView = isTriggerVisible(currentTarget, rootScrollParent)
      const handleScroll = () => {
        if (!ticking) {
          ticking = true
          animationFrame = window.requestAnimationFrame(() => {
            animationFrame = 0
            ticking = false
            onReposition()
          })
        }

        const isInView = isTriggerVisible(currentTarget, rootScrollParent)
        if (isInView !== previousIsInView) {
          previousIsInView = isInView
          onVisibilityChange?.(isInView)
        }
      }
      const resizeObserver = new ResizeObserver(onReposition)
      const enclosingShadowRoots = getDOMShadowRoots(rootElement ?? currentTarget)
      resizeObserver.observe(currentTarget)

      const unregister = mergeRegister(
        registerEventListener(window, 'resize', onReposition),
        registerEventListener(document, 'scroll', handleScroll, {
          capture: true,
          passive: true,
        }),
        ...enclosingShadowRoots.map((root) =>
          registerEventListener(root, 'scroll', handleScroll, {
            capture: true,
            passive: true,
          }),
        ),
        () => resizeObserver.unobserve(currentTarget),
        () => {
          if (animationFrame !== 0) {
            window.cancelAnimationFrame(animationFrame)
          }
        },
      )
      onCleanup(unregister)
    },
    { immediate: true },
  )

  onUnmounted(() => stopWatch?.())
}
