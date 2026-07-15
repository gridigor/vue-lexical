import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, defineExtension } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { ExtensionComponent } from '../src/ExtensionComponent'
import { LexicalExtensionComposer } from '../src/LexicalExtensionComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { generateTreeViewContent } from '../src/LexicalTreeView'
import { TreeViewExtension } from '../src/TreeViewExtension'

const TreeRootExtension = defineExtension({
  $initialEditorState: () => {
    $getRoot().append($createParagraphNode().append($createTextNode('hello tree')))
  },
  dependencies: [TreeViewExtension],
  name: 'tree-view-root',
  namespace: 'tree-view-root',
})

describe('TreeViewExtension', () => {
  it('renders a reactive tree and JSON representation with configurable classes', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })
    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: TreeRootExtension },
      slots: {
        default: () => [
          h(ExtensionComponent, { extension: TreeViewExtension }),
          h(ExtensionComponent, {
            extension: TreeViewExtension,
            treeTypeButtonClassName: 'custom-toggle',
            viewClassName: 'custom-tree',
          }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    expect(wrapper.get('.tree-view-output pre').text()).toContain('root')
    expect(wrapper.get('.tree-view-output pre').text()).toContain('text "hello tree"')
    expect(wrapper.get('.custom-tree').element).toBeInstanceOf(HTMLDivElement)
    expect(wrapper.get('.custom-toggle').element).toBeInstanceOf(HTMLButtonElement)

    await wrapper.get('.custom-toggle').trigger('click')
    expect(wrapper.get('.custom-tree pre').text()).toContain('"type": "text"')
    expect(generateTreeViewContent(editor!.getEditorState(), true)).toContain('"hello tree"')

    editor!.update(
      () => {
        $getRoot().append($createParagraphNode())
      },
      { discrete: true },
    )
    await nextTick()
    expect(
      wrapper
        .get('.tree-view-output pre')
        .text()
        .match(/paragraph/g),
    ).toHaveLength(2)

    editor!.setEditable(false)
    await nextTick()
    wrapper.unmount()
  })
})
