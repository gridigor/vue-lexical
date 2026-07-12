import { $createOverflowNode, $isOverflowNode, OverflowNode } from '@lexical/overflow'
import { $rootTextContent } from '@lexical/text'
import { $dfsWithSlots, $unwrapNode } from '@lexical/utils'
import {
  $findMatchingParent,
  $getSelection,
  $getSlotHost,
  $isElementNode,
  $isLeafNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  DELETE_CHARACTER_COMMAND,
  HISTORY_MERGE_TAG,
  mergeRegister,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical'

export interface CharacterLimitOptions {
  remainingCharacters?: (characters: number) => void
  strlen?: (input: string) => number
}

export function registerCharacterLimit(
  editor: LexicalEditor,
  maxCharacters: number,
  options: CharacterLimitOptions = {},
): () => void {
  if (!editor.hasNodes([OverflowNode])) {
    throw new Error(
      'CharacterLimitPlugin: OverflowNode is not registered. Add OverflowNode to initialConfig.nodes.',
    )
  }

  const strlen = options.strlen ?? ((input: string) => input.length)
  const remainingCharacters = options.remainingCharacters ?? (() => {})
  let text = editor.read('latest', $rootTextContent)
  let lastComputedTextLength = 0

  return mergeRegister(
    editor.registerTextContentListener((currentText) => {
      text = currentText
    }),
    editor.registerUpdateListener(({ dirtyLeaves, dirtyElements }) => {
      const hasContentChanges = dirtyLeaves.size > 0 || dirtyElements.size > 0
      if (editor.isComposing() || !hasContentChanges) {
        return
      }

      const textLength = strlen(text)
      const crossedThreshold = textLength > maxCharacters || lastComputedTextLength > maxCharacters
      remainingCharacters(maxCharacters - textLength)

      if (crossedThreshold) {
        const offset = findOffset(text, maxCharacters, strlen)
        editor.update(() => $wrapOverflowedNodes(offset), { tag: HISTORY_MERGE_TAG })
      }

      lastComputedTextLength = textLength
    }),
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (isBackward) => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          return false
        }

        const anchorNode = selection.anchor.getNode()
        const overflow = anchorNode.getParent()
        const overflowParent = overflow?.getParent() ?? null
        const parentNext = overflowParent?.getNextSibling() ?? null
        selection.deleteCharacter(isBackward)

        if (overflowParent?.isEmpty()) {
          overflowParent.remove()
        } else if ($isElementNode(parentNext) && parentNext.isEmpty()) {
          parentNext.remove()
        }
        return true
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
}

function findOffset(
  text: string,
  maxCharacters: number,
  strlen: (input: string) => number,
): number {
  let utf16Offset = 0
  let measuredOffset = 0
  const segments =
    typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter().segment(text), ({ segment }) => segment)
      : Array.from(text)

  for (const segment of segments) {
    const nextOffset = measuredOffset + strlen(segment)
    if (nextOffset > maxCharacters) {
      break
    }
    measuredOffset = nextOffset
    utf16Offset += segment.length
  }

  return utf16Offset
}

export function $wrapOverflowedNodes(offset: number): void {
  const nodes = $dfsWithSlots()
  let accumulatedLength = 0

  for (const { node } of nodes) {
    const isSlotValueLeaf = $isLeafNode(node) && $getSlotHost(node) !== null
    const needsOverflowParent =
      $isLeafNode(node) && !isSlotValueLeaf && !$findMatchingParent(node, $isOverflowNode)

    if ($isOverflowNode(node)) {
      const previousLength = accumulatedLength
      const nextLength = accumulatedLength + node.getTextContentSize()

      if (nextLength <= offset) {
        const parent = node.getParent()
        const previousSibling = node.getPreviousSibling()
        const nextSibling = node.getNextSibling()
        $unwrapNode(node)
        const selection = $getSelection()

        if (
          $isRangeSelection(selection) &&
          (!selection.anchor.getNode().isAttached() || !selection.focus.getNode().isAttached())
        ) {
          if ($isTextNode(previousSibling)) {
            previousSibling.select()
          } else if ($isTextNode(nextSibling)) {
            nextSibling.select()
          } else {
            parent?.select()
          }
        }
      } else if (previousLength < offset) {
        const descendant = node.getFirstDescendant()
        const descendantLength = descendant?.getTextContentSize() ?? 0
        const firstDescendantIsSimpleText = $isTextNode(descendant) && descendant.isSimpleText()
        if (firstDescendantIsSimpleText || previousLength + descendantLength <= offset) {
          $unwrapNode(node)
        }
      }
    } else if (isSlotValueLeaf) {
      accumulatedLength += node.getTextContentSize()
    } else if (needsOverflowParent) {
      const previousLength = accumulatedLength
      accumulatedLength += node.getTextContentSize()

      if (accumulatedLength > offset && !$isOverflowNode(node.getParent())) {
        const previousSelection = $getSelection()
        let overflowNode: OverflowNode

        if (previousLength < offset && $isTextNode(node) && node.isSimpleText()) {
          const [, overflowedText] = node.splitText(offset - previousLength)
          overflowNode = $wrapNode(overflowedText)
        } else {
          overflowNode = $wrapNode(node)
        }

        if (previousSelection !== null) {
          $setSelection(previousSelection)
        }
        $mergePrevious(overflowNode)
      }
    }
  }
}

function $wrapNode(node: LexicalNode): OverflowNode {
  const overflowNode = $createOverflowNode()
  node.replace(overflowNode)
  overflowNode.append(node)
  return overflowNode
}

export function $mergePrevious(overflowNode: OverflowNode): void {
  const previousNode = overflowNode.getPreviousSibling()
  if (!$isOverflowNode(previousNode)) {
    return
  }

  const firstChild = overflowNode.getFirstChild()
  const previousChildren = previousNode.getChildren()
  if (firstChild === null) {
    overflowNode.append(...previousChildren)
  } else {
    for (const child of previousChildren) {
      firstChild.insertBefore(child)
    }
  }

  const selection = $getSelection()
  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor
    const focus = selection.focus
    const anchorNode = anchor.getNode()
    const focusNode = focus.getNode()

    if (anchorNode.is(previousNode)) {
      anchor.set(overflowNode.getKey(), anchor.offset, 'element')
    } else if (anchorNode.is(overflowNode)) {
      anchor.set(overflowNode.getKey(), previousChildren.length + anchor.offset, 'element')
    }

    if (focusNode.is(previousNode)) {
      focus.set(overflowNode.getKey(), focus.offset, 'element')
    } else if (focusNode.is(overflowNode)) {
      focus.set(overflowNode.getKey(), previousChildren.length + focus.offset, 'element')
    }
  }

  previousNode.remove()
}
