import { $createHeadingNode, $isHeadingNode, HeadingNode } from '@lexical/rich-text'
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot } from 'lexical'
import type { LexicalEditor, NodeKey } from 'lexical'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import {
  TableOfContentsPlugin,
  type TableOfContentsEntry,
} from '../src/LexicalTableOfContentsPlugin'

const onError = (error: Error) => {
  throw error
}

async function flushEditor(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('LexicalTableOfContentsPlugin', () => {
  it('tracks heading creation, text, order, and removal', async () => {
    let editor: LexicalEditor | undefined
    let firstKey: NodeKey | undefined
    let secondKey: NodeKey | undefined

    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'table-of-contents',
          nodes: [HeadingNode],
          onError,
          editorState: () => {
            const first = $createHeadingNode('h1').append($createTextNode('First'))
            const second = $createHeadingNode('h2').append($createTextNode('Second'))
            firstKey = first.getKey()
            secondKey = second.getKey()
            $getRoot().append(
              $createParagraphNode().append($createTextNode('Introduction')),
              first,
              second,
            )
          },
        },
      },
      slots: {
        default: () => [
          h(CaptureEditor),
          h(TableOfContentsPlugin, null, {
            default: ({ tableOfContents }: { tableOfContents: TableOfContentsEntry[] }) =>
              h(
                'ol',
                tableOfContents.map(([key, text, tag]) =>
                  h('li', { 'data-key': key, 'data-tag': tag }, text),
                ),
              ),
          }),
        ],
      },
    })
    await flushEditor()

    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['First', 'Second'])
    expect(wrapper.findAll('li').map((item) => item.attributes('data-tag'))).toEqual(['h1', 'h2'])

    if (editor === undefined || firstKey === undefined || secondKey === undefined) {
      throw new Error('Test editor was not initialized')
    }
    const activeEditor = editor as LexicalEditor
    const activeFirstKey = firstKey as NodeKey
    const activeSecondKey = secondKey as NodeKey

    activeEditor.update(
      () => {
        const first = $getNodeByKey(activeFirstKey)
        const second = $getNodeByKey(activeSecondKey)
        if ($isHeadingNode(first)) {
          first.clear().append($createTextNode('First updated'))
        }
        if ($isHeadingNode(first) && $isHeadingNode(second)) {
          first.insertBefore(second)
        }
      },
      { discrete: true },
    )
    await flushEditor()
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['Second', 'First updated'])

    activeEditor.update(
      () => {
        $getNodeByKey(activeSecondKey)?.remove()
        $getRoot().append($createHeadingNode('h3').append($createTextNode('Third')))
      },
      { discrete: true },
    )
    await flushEditor()
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['First updated', 'Third'])

    activeEditor.update(
      () => {
        $getRoot().selectStart()
      },
      { discrete: true },
    )
    await flushEditor()
    expect(wrapper.findAll('li').map((item) => item.text())).toEqual(['First updated', 'Third'])

    wrapper.unmount()
    activeEditor.update(() => {
      $getRoot().clear()
    })
  })

  it('requires HeadingNode and supports an omitted slot', () => {
    expect(() =>
      mount(LexicalComposer, {
        props: {
          initialConfig: { namespace: 'missing-heading', onError },
        },
        slots: { default: () => h(TableOfContentsPlugin) },
      }),
    ).toThrow(/HeadingNode must be registered/)

    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'empty-table-of-contents',
          nodes: [HeadingNode],
          onError,
        },
      },
      slots: { default: () => h(TableOfContentsPlugin) },
    })
    expect(wrapper.html()).toBe('')
  })
})
