import { $createOverflowNode, $isOverflowNode, OverflowNode } from '@lexical/overflow'
import type { LexicalEditor } from 'lexical'
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $setSlot,
  $setSelection,
  createEditor,
  DecoratorNode,
  DELETE_CHARACTER_COMMAND,
  type EditorConfig,
  type NodeKey,
} from 'lexical'
import { mount } from '@vue/test-utils'
import type { Ref } from 'vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CharacterLimitPlugin,
  type CharacterLimitSlotProps,
} from '../src/LexicalCharacterLimitPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { MaxLengthPlugin } from '../src/LexicalMaxLengthPlugin'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { useLexicalIsTextContentEmpty } from '../src/useLexicalIsTextContentEmpty'
import {
  $mergePrevious,
  $wrapOverflowedNodes,
  registerCharacterLimit,
} from '../src/useCharacterLimit'

const onError = (error: Error) => {
  throw error
}

class TextSlotNode extends DecoratorNode<null> {
  static getType(): string {
    return 'coverage-text-slot'
  }

  static clone(node: TextSlotNode): TextSlotNode {
    return new TextSlotNode(node.getKey())
  }

  constructor(key: NodeKey | undefined = undefined) {
    super(key)
  }

  createDOM(_config: EditorConfig): HTMLElement {
    return document.createElement('span')
  }

  updateDOM(): boolean {
    return false
  }

  getTextContent(): string {
    return 'slot'
  }

  isInline(): boolean {
    return false
  }

  decorate(): null {
    return null
  }
}

async function flushEditorUpdates(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function replaceText(editor: LexicalEditor, text: string): void {
  editor.update(
    () => {
      const textNode = $createTextNode(text)
      $getRoot().clear().append($createParagraphNode().append(textNode))
      textNode.selectEnd()
    },
    { discrete: true },
  )
}

describe('text limit plugins', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports remaining characters and wraps overflowing text', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'character-limit', nodes: [OverflowNode], onError },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(
            CharacterLimitPlugin,
            { maxLength: 5 },
            {
              default: ({ remainingCharacters }: CharacterLimitSlotProps) =>
                h('output', { 'data-testid': 'remaining' }, remainingCharacters),
            },
          ),
        ],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '1234567')
    await flushEditorUpdates()

    expect(wrapper.get('[data-testid="remaining"]').text()).toBe('-2')
    expect(
      editorRef.value?.getEditorState().read(() => {
        const paragraph = $getRoot().getFirstChild()
        return $isElementNode(paragraph) && $isOverflowNode(paragraph.getLastChild())
      }),
    ).toBe(true)
    wrapper.unmount()
  })

  it('can measure the limit in UTF-8 bytes', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'utf8-limit', nodes: [OverflowNode], onError },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(CharacterLimitPlugin, { charset: 'UTF-8', maxLength: 4 }),
        ],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '😀a')
    await flushEditorUpdates()

    expect(wrapper.get('.characters-limit').text()).toBe('-1')
    expect(wrapper.get('.characters-limit').classes()).toContain('characters-limit-exceeded')
  })

  it('falls back to URI-based UTF-8 measurement without TextEncoder', async () => {
    vi.stubGlobal('TextEncoder', undefined)
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'utf8-fallback', nodes: [OverflowNode], onError },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(CharacterLimitPlugin, { charset: 'UTF-8', maxLength: 4 }),
        ],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '😀a')
    await flushEditorUpdates()
    expect(wrapper.get('.characters-limit').text()).toBe('-1')
  })

  it('trims text that exceeds the hard maximum length', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'max-length', onError },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(MaxLengthPlugin, { maxLength: 5 })],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '1234567')
    await flushEditorUpdates()

    expect(editorRef.value?.getEditorState().read(() => $getRoot().getTextContent())).toBe('12345')
    wrapper.unmount()
  })

  it('restores the previous state when typing beyond an already reached hard limit', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'max-length-restore', onError },
      },
      slots: {
        default: () => [h(EditorRefPlugin, { editorRef }), h(MaxLengthPlugin, { maxLength: 5 })],
      },
    })
    await nextTick()

    replaceText(editorRef.value!, '12345')
    editorRef.value?.update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        if (!$isElementNode(paragraph)) {
          throw new Error('Expected paragraph')
        }
        const text = paragraph.getFirstChild()
        text?.selectEnd()
        paragraph.append($createTextNode('6'))
      },
      { discrete: true },
    )
    await flushEditorUpdates()

    expect(editorRef.value?.getEditorState().read(() => $getRoot().getTextContent())).toBe('12345')
    wrapper.unmount()
  })

  it('reactively tracks empty and whitespace-only text', async () => {
    let editor: LexicalEditor | undefined
    let isEmpty: Readonly<Ref<boolean>> | undefined
    let isTrimmedEmpty: Readonly<Ref<boolean>> | undefined
    const CaptureState = defineComponent({
      setup() {
        editor = useLexicalComposer()
        isEmpty = useLexicalIsTextContentEmpty(editor, false)
        isTrimmedEmpty = useLexicalIsTextContentEmpty(editor, true)
        return () => null
      },
    })
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'empty-content', onError },
      },
      slots: { default: () => h(CaptureState) },
    })
    await nextTick()

    expect(isEmpty?.value).toBe(true)
    expect(isTrimmedEmpty?.value).toBe(true)

    replaceText(editor!, '   ')
    await flushEditorUpdates()
    expect(isEmpty?.value).toBe(false)
    expect(isTrimmedEmpty?.value).toBe(true)

    replaceText(editor!, ' x ')
    await flushEditorUpdates()
    expect(isTrimmedEmpty?.value).toBe(false)
    wrapper.unmount()
  })

  it('requires OverflowNode registration', () => {
    const editor = createEditor({ namespace: 'missing-overflow', onError })
    expect(() => registerCharacterLimit(editor, 5)).toThrow(
      'Add OverflowNode to initialConfig.nodes',
    )
  })

  it('supports default limit callbacks and unregisters cleanly', async () => {
    const editor = createEditor({
      namespace: 'default-limit-options',
      nodes: [OverflowNode],
      onError,
    })
    const unregister = registerCharacterLimit(editor, 3)

    replaceText(editor, '12345')
    await flushEditorUpdates()
    expect(
      editor.getEditorState().read(() => {
        const paragraph = $getRoot().getFirstChild()
        return $isElementNode(paragraph) && $isOverflowNode(paragraph.getLastChild())
      }),
    ).toBe(true)

    unregister()
    replaceText(editor, '123456')
    await flushEditorUpdates()
    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('123456')
  })

  it('skips composition updates and declines deletion without a range selection', () => {
    const editor = createEditor({ namespace: 'limit-guards', nodes: [OverflowNode], onError })
    const remainingCharacters = vi.fn()
    const originalIsComposing = editor.isComposing
    editor.isComposing = () => true
    const unregister = registerCharacterLimit(editor, 3, { remainingCharacters })

    replaceText(editor, '12345')
    expect(remainingCharacters).not.toHaveBeenCalled()

    editor.isComposing = originalIsComposing
    editor.update(() => $setSelection(null), { discrete: true })
    expect(editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true)).toBe(false)
    unregister()
  })

  it('unwraps overflowed content after the limit grows', async () => {
    const editor = createEditor({ namespace: 'unwrap-overflow', nodes: [OverflowNode], onError })
    const unregister = registerCharacterLimit(editor, 3)
    replaceText(editor, '12345')
    await flushEditorUpdates()
    unregister()

    editor.update(() => $wrapOverflowedNodes(5), { discrete: true })

    expect(
      editor.getEditorState().read(() => {
        const paragraph = $getRoot().getFirstChild()
        return (
          $isElementNode(paragraph) &&
          paragraph.getChildren().every((node) => !$isOverflowNode(node))
        )
      }),
    ).toBe(true)
  })

  it('redimensions an existing overflow node when the boundary moves inside it', () => {
    const editor = createEditor({
      namespace: 'redimension-overflow',
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const overflow = $createOverflowNode().append($createTextNode('345'))
        $getRoot().append($createParagraphNode().append($createTextNode('12'), overflow))
        $wrapOverflowedNodes(4)
      },
      { discrete: true },
    )

    expect(editor.getEditorState().read(() => $getRoot().getTextContent())).toBe('12345')
  })

  it('wraps a non-simple token node as a whole', () => {
    const editor = createEditor({ namespace: 'token-overflow', nodes: [OverflowNode], onError })
    editor.update(
      () => {
        const token = $createTextNode('token').setMode('token')
        $getRoot().append($createParagraphNode().append(token))
        $wrapOverflowedNodes(0)
        expect($isOverflowNode(token.getParent())).toBe(true)
      },
      { discrete: true },
    )
  })

  it('handles character deletion inside overflow content', async () => {
    const editor = createEditor({ namespace: 'delete-overflow', nodes: [OverflowNode], onError })
    const rootElement = document.createElement('div')
    rootElement.contentEditable = 'true'
    document.body.append(rootElement)
    editor.setRootElement(rootElement)
    const unregister = registerCharacterLimit(editor, 3)
    replaceText(editor, '12345')
    await flushEditorUpdates()

    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChild()
        const overflow = $isElementNode(paragraph) ? paragraph.getLastChild() : null
        const overflowText = $isOverflowNode(overflow) ? overflow.getFirstChild() : null
        overflowText?.selectEnd()
      },
      { discrete: true },
    )
    expect(editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true)).toBe(true)
    await flushEditorUpdates()
    expect(
      editor.getEditorState().read(() =>
        $getSelection()
          ?.getNodes()
          .every((node) => node.isAttached()),
      ),
    ).toBe(true)
    unregister()
    editor.setRootElement(null)
    rootElement.remove()
  })

  it('removes an emptied overflow paragraph after deletion', () => {
    const editor = createEditor({
      namespace: 'delete-empty-overflow',
      nodes: [OverflowNode],
      onError,
    })
    const unregister = registerCharacterLimit(editor, 3)

    editor.update(
      () => {
        const text = $createTextNode('x')
        const paragraph = $createParagraphNode().append($createOverflowNode().append(text))
        $getRoot().append(paragraph)
        text.selectEnd()
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection')
        }
        selection.deleteCharacter = () => paragraph.clear()

        expect(editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true)).toBe(true)
        expect(paragraph.isAttached()).toBe(false)
      },
      { discrete: true },
    )
    unregister()
  })

  it('removes an empty paragraph following overflow content after deletion', () => {
    const editor = createEditor({ namespace: 'delete-next-empty', nodes: [OverflowNode], onError })
    const unregister = registerCharacterLimit(editor, 3)

    editor.update(
      () => {
        const text = $createTextNode('x')
        const paragraph = $createParagraphNode().append($createOverflowNode().append(text))
        const emptyParagraph = $createParagraphNode()
        $getRoot().append(paragraph, emptyParagraph)
        text.selectEnd()
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection')
        }
        selection.deleteCharacter = () => {}

        expect(editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true)).toBe(true)
        expect(emptyParagraph.isAttached()).toBe(false)
      },
      { discrete: true },
    )
    unregister()
  })

  it('counts slotted decorator text when locating the overflow boundary', () => {
    const editor = createEditor({
      namespace: 'slotted-overflow',
      nodes: [OverflowNode, TextSlotNode],
      onError,
    })
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append($createTextNode('123'))
        $getRoot().append(paragraph)
        $setSlot(paragraph, 'media', $create(TextSlotNode))
        $wrapOverflowedNodes(5)

        const [kept, overflow] = paragraph.getChildren()
        expect(kept.getTextContent()).toBe('1')
        expect($isOverflowNode(overflow)).toBe(true)
      },
      { discrete: true },
    )
  })

  it('counts block separators when locating the overflow boundary', () => {
    const editor = createEditor({
      namespace: 'block-separator-overflow',
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const first = $createParagraphNode().append($createTextNode('abc'))
        const second = $createParagraphNode().append($createTextNode('def'))
        $getRoot().append(first, second)
        $wrapOverflowedNodes(4)

        expect(second.getChildren()).toHaveLength(1)
        expect($isOverflowNode(second.getFirstChild())).toBe(true)
      },
      { discrete: true },
    )
  })

  it('merges the next overflow node after wrapping a new boundary', () => {
    const editor = createEditor({
      namespace: 'merge-next-overflow',
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const paragraph = $createParagraphNode().append(
          $createTextNode('a'),
          $createOverflowNode().append($createTextNode('bc')),
        )
        $getRoot().append(paragraph)
        $wrapOverflowedNodes(0)

        expect(paragraph.getChildren()).toHaveLength(1)
        expect($isOverflowNode(paragraph.getFirstChild())).toBe(true)
        expect(paragraph.getTextContent()).toBe('abc')
      },
      { discrete: true },
    )
  })

  it('merges adjacent overflow nodes while preserving a cross-node selection', () => {
    const editor = createEditor({ namespace: 'merge-overflow', nodes: [OverflowNode], onError })

    editor.update(
      () => {
        const left = $createOverflowNode().append($createTextNode('left'))
        const right = $createOverflowNode().append($createTextNode('right'))
        $getRoot().append($createParagraphNode().append(left, right))
        left.select(0, 1)
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection')
        }
        selection.focus.set(right.getKey(), 1, 'element')

        $mergePrevious(right)

        expect(right.getTextContent()).toBe('leftright')
        expect(selection.anchor.getNode().isAttached()).toBe(true)
        expect(selection.focus.getNode().isAttached()).toBe(true)
      },
      { discrete: true },
    )
  })

  it('moves previous overflow children into an empty overflow node', () => {
    const editor = createEditor({
      namespace: 'merge-empty-overflow',
      nodes: [OverflowNode],
      onError,
    })

    editor.update(
      () => {
        const left = $createOverflowNode().append($createTextNode('left'))
        const right = $createOverflowNode()
        $getRoot().append($createParagraphNode().append(left, right))
        $mergePrevious(right)
        expect(right.getTextContent()).toBe('left')
      },
      { discrete: true },
    )
  })

  it('moves a collapsed selection from the previous overflow node', () => {
    const editor = createEditor({
      namespace: 'merge-previous-selection',
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const left = $createOverflowNode().append($createTextNode('left'))
        const right = $createOverflowNode().append($createTextNode('right'))
        $getRoot().append($createParagraphNode().append(left, right))
        left.select(0, 0)
        $mergePrevious(right)

        const selection = $getSelection()
        expect(selection?.getNodes().every((node) => node.isAttached())).toBe(true)
      },
      { discrete: true },
    )
  })

  it('adjusts a selection owned by the destination overflow node', () => {
    const editor = createEditor({
      namespace: 'merge-selected-destination',
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const left = $createOverflowNode().append($createTextNode('left'))
        const right = $createOverflowNode().append($createTextNode('right'))
        $getRoot().append($createParagraphNode().append(left, right))
        right.select(0, 1)
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection')
        }
        vi.spyOn(selection.anchor, 'getNode').mockReturnValue(right)
        vi.spyOn(selection.focus, 'getNode').mockReturnValue(right)
        $mergePrevious(right)

        expect(
          $getSelection()
            ?.getNodes()
            .every((node) => node.isAttached()),
        ).toBe(true)
      },
      { discrete: true },
    )
  })

  it.each([
    ['previous text sibling', 'previous'],
    ['next text sibling', 'next'],
    ['parent element', 'parent'],
  ] as const)('restores selection from an unwrapped overflow using the %s', (_label, fallback) => {
    const editor = createEditor({
      namespace: `unwrap-selection-${fallback}`,
      nodes: [OverflowNode],
      onError,
    })
    editor.update(
      () => {
        const overflow = $createOverflowNode().append($createTextNode('b'))
        const paragraph = $createParagraphNode()
        if (fallback === 'previous') {
          paragraph.append($createTextNode('a'), overflow)
        } else if (fallback === 'next') {
          paragraph.append(overflow, $createTextNode('c'))
        } else {
          paragraph.append(overflow)
        }
        $getRoot().append(paragraph)
        overflow.select()
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection')
        }
        vi.spyOn(selection.anchor, 'getNode').mockReturnValue(overflow)
        vi.spyOn(selection.focus, 'getNode').mockReturnValue(overflow)

        $wrapOverflowedNodes(paragraph.getTextContentSize())

        expect(overflow.isAttached()).toBe(false)
        expect(
          $getSelection()
            ?.getNodes()
            .every((node) => node.isAttached()),
        ).toBe(true)
      },
      { discrete: true },
    )
  })
})
