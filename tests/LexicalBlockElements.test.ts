import type { ElementFormatType, LexicalEditor, LexicalNode, NodeKey } from 'lexical'
import type { VNodeChild } from 'vue'
import {
  $create,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isTextNode,
  $setSelection,
  CLICK_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  createEditor,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  BlockWithAlignableContents,
  type BlockWithAlignableContentsClassName,
} from '../src/LexicalBlockWithAlignableContents'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import {
  $isDecoratorBlockNode,
  DecoratorBlockNode,
  type SerializedDecoratorBlockNode,
} from '../src/LexicalDecoratorBlockNode'
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from '../src/LexicalHorizontalRuleNode'
import { HorizontalRulePlugin } from '../src/LexicalHorizontalRulePlugin'
import { useLexicalNodeSelection } from '../src/useLexicalNodeSelection'

const onError = (error: Error) => {
  throw error
}

const blockClassName: BlockWithAlignableContentsClassName = {
  base: 'block',
  focus: 'block-focused',
}

class TestBlockNode extends DecoratorBlockNode {
  static getType(): string {
    return 'test-block'
  }

  static clone(node: TestBlockNode): TestBlockNode {
    return new TestBlockNode(node.getFormat(), node.getKey())
  }

  static importJSON(serializedNode: SerializedDecoratorBlockNode): TestBlockNode {
    return $createTestBlockNode().updateFromJSON(serializedNode)
  }

  decorate(): VNodeChild {
    return h(
      BlockWithAlignableContents,
      {
        className: blockClassName,
        format: this.getFormat(),
        nodeKey: this.getKey(),
      },
      { default: () => h('span', { 'data-testid': 'block-child' }, 'embed') },
    )
  }
}

function $createTestBlockNode(format?: ElementFormatType): TestBlockNode {
  return $create(TestBlockNode).setFormat(format ?? '')
}

function $getTestBlockNode(key: NodeKey): TestBlockNode {
  const node: LexicalNode | null = $getNodeByKey(key)
  if (!(node instanceof TestBlockNode)) {
    throw new Error(`Expected TestBlockNode ${key}.`)
  }
  return node
}

function editorCapture(onCapture: (editor: LexicalEditor) => void) {
  return defineComponent({
    name: 'BlockEditorCapture',
    setup() {
      onCapture(useLexicalComposer())
      return () => null
    },
  })
}

async function flushEditor(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('DecoratorBlockNode', () => {
  it('stores, clones, serializes, and restores block alignment', () => {
    const editor = createEditor({
      namespace: 'decorator-block-node',
      nodes: [TestBlockNode],
      onError,
    })

    editor.update(
      () => {
        const node = $createTestBlockNode('center')
        $getRoot().append(node)

        expect(node.canIndent()).toBe(false)
        expect(node.isInline()).toBe(false)
        expect(node.createDOM().tagName).toBe('DIV')
        expect(node.updateDOM()).toBe(false)
        expect(node.getFormat()).toBe('center')
        expect(node.exportJSON()).toMatchObject({ format: 'center', type: 'test-block' })
        expect($isDecoratorBlockNode(node)).toBe(true)
        expect($isDecoratorBlockNode(null)).toBe(false)

        const clone = new TestBlockNode()
        clone.afterCloneFrom(node)
        expect(Reflect.get(clone, '__format')).toBe('center')
      },
      { discrete: true },
    )

    const serialized = JSON.stringify(editor.getEditorState())
    const restoredEditor = createEditor({
      namespace: 'restored-decorator-block-node',
      nodes: [TestBlockNode],
      onError,
    })
    restoredEditor.setEditorState(restoredEditor.parseEditorState(serialized))
    restoredEditor.read('latest', () => {
      expect(($getRoot().getFirstChildOrThrow() as TestBlockNode).getFormat()).toBe('center')
    })
  })
})

describe('BlockWithAlignableContents', () => {
  it('supports node selection, range formatting, and click targeting', async () => {
    let editor: LexicalEditor | undefined
    let firstKey: NodeKey | undefined
    let secondKey: NodeKey | undefined
    const Capture = editorCapture((value) => {
      editor = value
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'alignable-block',
          nodes: [TestBlockNode],
          onError,
          editorState: () => {
            const before = $createParagraphNode().append($createTextNode('before'))
            const first = $createTestBlockNode('right')
            const second = $createTestBlockNode()
            const after = $createParagraphNode().append($createTextNode('after'))
            firstKey = first.getKey()
            secondKey = second.getKey()
            $getRoot().append(before, first, second, after)
          },
        },
      },
      slots: { default: () => [h(ContentEditable), h(Capture)] },
    })

    await flushEditor()
    if (editor === undefined || firstKey === undefined || secondKey === undefined) {
      throw new Error('Expected editor and block keys.')
    }

    const blocks = wrapper.findAll('.block')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].attributes('style')).toContain('text-align: right')

    expect(editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'))).toBe(false)
    await blocks[0].get('[data-testid="block-child"]').trigger('click')
    expect(blocks[0].classes()).not.toContain('block-focused')

    await blocks[0].trigger('click')
    await flushEditor()
    expect(blocks[0].classes()).toContain('block-focused')
    editor.read('latest', () => {
      const selection = $getSelection()
      expect($isNodeSelection(selection) && selection.has(firstKey as NodeKey)).toBe(true)
    })

    expect(editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')).toBe(true)
    await flushEditor()
    expect(wrapper.findAll('.block')[0].attributes('style')).toContain('text-align: center')

    await blocks[1].trigger('click', { shiftKey: true })
    await flushEditor()
    editor.read('latest', () => {
      const selection = $getSelection()
      expect($isNodeSelection(selection) && selection.getNodes().length).toBe(2)
    })

    editor.update(
      () => {
        const root = $getRoot()
        const before = root.getFirstChildOrThrow()
        const after = root.getLastChildOrThrow()
        if (!$isElementNode(before) || !$isElementNode(after)) {
          throw new Error('Expected paragraph boundaries.')
        }
        const beforeText = before.getFirstChildOrThrow()
        const afterText = after.getFirstChildOrThrow()
        if (!$isTextNode(beforeText) || !$isTextNode(afterText)) {
          throw new Error('Expected text boundaries.')
        }
        before.selectStart().setTextNodeRange(beforeText, 0, afterText, 5)
        editor?.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')
      },
      { discrete: true },
    )

    editor.read('latest', () => {
      expect($getTestBlockNode(firstKey as NodeKey).getFormat()).toBe('justify')
      expect($getTestBlockNode(secondKey as NodeKey).getFormat()).toBe('justify')
      const first = $getRoot().getFirstChildOrThrow()
      const last = $getRoot().getLastChildOrThrow()
      expect($isElementNode(first) && first.getFormatType()).toBe('justify')
      expect($isElementNode(last) && last.getFormatType()).toBe('justify')
    })

    editor.update(() => $getRoot().getFirstChildOrThrow().selectStart(), { discrete: true })
    await flushEditor()
    expect(editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')).toBe(false)
    wrapper.unmount()
  })

  it('exposes reactive node-selection controls and handles missing nodes', async () => {
    let editor: LexicalEditor | undefined
    let blockKey: NodeKey | undefined
    let controls: ReturnType<typeof useLexicalNodeSelection> | undefined
    const Controls = defineComponent({
      name: 'NodeSelectionControls',
      setup() {
        controls = useLexicalNodeSelection(blockKey as NodeKey)
        return () => h('output', String(controls?.[0].value))
      },
    })
    const MissingControls = defineComponent({
      name: 'MissingNodeSelectionControls',
      setup() {
        const [selected, , clear] = useLexicalNodeSelection('missing')
        clear()
        return () => h('output', { class: 'missing' }, String(selected.value))
      },
    })
    const Capture = editorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'node-selection-composable',
          nodes: [TestBlockNode],
          onError,
          editorState: () => {
            const node = $createTestBlockNode()
            blockKey = node.getKey()
            $getRoot().append(node)
          },
        },
      },
      slots: { default: () => [h(ContentEditable), h(Controls), h(MissingControls), h(Capture)] },
    })

    await flushEditor()
    expect(wrapper.get('output').text()).toBe('false')
    expect(wrapper.get('.missing').text()).toBe('false')

    controls?.[1](true)
    await flushEditor()
    expect(wrapper.get('output').text()).toBe('true')

    controls?.[1](false)
    await flushEditor()
    expect(wrapper.get('output').text()).toBe('false')

    editor?.update(
      () => {
        const selection = $createNodeSelection()
        selection.add(blockKey as NodeKey)
        $setSelection(selection)
      },
      { discrete: true },
    )
    await flushEditor()
    controls?.[2]()
    await flushEditor()
    expect(wrapper.get('output').text()).toBe('false')

    wrapper.unmount()
  })
})

describe('HorizontalRuleNode and HorizontalRulePlugin', () => {
  it('inserts, selects, styles, serializes, and imports horizontal rules', async () => {
    let editor: LexicalEditor | undefined
    const Capture = editorCapture((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'horizontal-rule',
          nodes: [HorizontalRuleNode],
          onError,
          theme: { hr: 'rule', hrSelected: 'rule-selected' },
          editorState: () => {
            $getRoot().append($createParagraphNode().append($createTextNode('before')))
            $getRoot().getFirstChildOrThrow().selectEnd()
          },
        },
      },
      slots: {
        default: () => [h(ContentEditable), h(HorizontalRulePlugin), h(Capture)],
      },
    })

    await flushEditor()
    if (editor === undefined) {
      throw new Error('Expected editor.')
    }
    expect(editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)).toBe(true)
    await flushEditor()

    const rule = wrapper.get('hr')
    expect(rule.classes()).toContain('rule')
    expect(editor.dispatchCommand(CLICK_COMMAND, new MouseEvent('click'))).toBe(false)
    await rule.trigger('click')
    await flushEditor()
    expect(rule.classes()).toContain('rule-selected')

    const ruleElement = rule.element
    await rule.trigger('click', { shiftKey: true })
    await flushEditor()
    expect(rule.classes()).not.toContain('rule-selected')

    editor.update(
      () => {
        const selection = $createNodeSelection()
        $setSelection(selection)
      },
      { discrete: true },
    )
    expect(editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)).toBe(false)

    editor.update(
      () => {
        const node = $createHorizontalRuleNode()
        expect($isHorizontalRuleNode(node)).toBe(true)
        expect(HorizontalRuleNode.clone(node)).toBeInstanceOf(HorizontalRuleNode)
        const serialized = node.exportJSON()
        expect(HorizontalRuleNode.importJSON(serialized)).toBeInstanceOf(HorizontalRuleNode)

        const importer = HorizontalRuleNode.importDOM()?.hr?.(document.createElement('hr'))
        const converted = importer?.conversion(document.createElement('hr'))
        expect(converted?.node).toBeInstanceOf(HorizontalRuleNode)
      },
      { discrete: true },
    )

    await rule.trigger('click')
    await flushEditor()
    expect(rule.classes()).toContain('rule-selected')
    wrapper.unmount()
    expect(ruleElement.classList).not.toContain('rule-selected')
  })

  it('uses the default selected class when the theme omits one', async () => {
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'horizontal-rule-default-theme',
          nodes: [HorizontalRuleNode],
          onError,
          editorState: () => $getRoot().append($createHorizontalRuleNode()),
        },
      },
      slots: { default: () => h(ContentEditable) },
    })

    await flushEditor()
    const rule = wrapper.get('hr')
    await rule.trigger('click')
    await flushEditor()
    expect(rule.classes()).toContain('selected')
    wrapper.unmount()
  })
})
