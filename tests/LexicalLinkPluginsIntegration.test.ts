import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot, $isElementNode } from 'lexical'
import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
  LinkNode,
  TOGGLE_LINK_COMMAND,
} from '@lexical/link'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { createLinkMatcherWithRegExp, LexicalAutoLinkPlugin } from '../src/LexicalAutoLinkPlugin'
import { LexicalClickableLinkPlugin } from '../src/LexicalClickableLinkPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { LexicalLinkPlugin } from '../src/LexicalLinkPlugin'

const onError = (error: Error) => {
  throw error
}

function firstChildDetails(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const paragraph = $getRoot().getFirstChildOrThrow()
    if (!$isElementNode(paragraph)) {
      throw new Error('Expected a paragraph')
    }
    const child = paragraph.getFirstChildOrThrow()
    return {
      isAutoLink: $isAutoLinkNode(child),
      isLink: $isLinkNode(child),
      url: $isLinkNode(child) ? child.getURL() : null,
    }
  })
}

describe('link plugins integration', () => {
  it('toggles links and validates URLs', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          editorState: () => {
            const text = $createTextNode('Vue')
            $getRoot().append($createParagraphNode().append(text))
            text.select(0, 3)
          },
          namespace: 'link-integration',
          nodes: [LinkNode],
          onError,
        },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(LexicalLinkPlugin, { validateUrl: (url) => url.startsWith('https://') }),
        ],
      },
    })
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'javascript:alert(1)')).toBe(false)
    expect(editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://vuejs.org')).toBe(true)
    await nextTick()

    expect(firstChildDetails(editor)).toEqual({
      isAutoLink: false,
      isLink: true,
      url: 'https://vuejs.org',
    })

    wrapper.unmount()
    expect(editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)).toBe(false)
  })

  it('creates automatic links and calls onChange', async () => {
    const editorRef = shallowRef<LexicalEditor | null>()
    const onChange = vi.fn()
    const matcher = createLinkMatcherWithRegExp(/vue\.dev/, (text) => `https://${text}`)
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          editorState: () => {
            $getRoot().append($createParagraphNode().append($createTextNode('vue.dev')))
          },
          namespace: 'auto-link-integration',
          nodes: [AutoLinkNode],
          onError,
        },
      },
      slots: {
        default: () => [
          h(EditorRefPlugin, { editorRef }),
          h(LexicalAutoLinkPlugin, { matchers: [matcher], onChange }),
        ],
      },
    })
    await nextTick()

    expect(firstChildDetails(editorRef.value!)).toEqual({
      isAutoLink: true,
      isLink: true,
      url: 'https://vue.dev',
    })
    expect(onChange).toHaveBeenCalledWith('https://vue.dev', null)

    wrapper.unmount()
  })

  it('opens clicked links using the configured target', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          editable: false,
          editorState: () => {
            const link = $createLinkNode('https://vuejs.org')
            link.append($createTextNode('Vue'))
            $getRoot().append($createParagraphNode().append(link))
          },
          namespace: 'clickable-link-integration',
          nodes: [LinkNode],
          onError,
        },
      },
      slots: {
        default: () => [
          h(LexicalContentEditable),
          h(LexicalClickableLinkPlugin, { newTab: false }),
        ],
      },
    })
    await nextTick()

    await wrapper.get('a').trigger('click')
    expect(open).toHaveBeenCalledWith('https://vuejs.org', '_self')

    wrapper.unmount()
    open.mockRestore()
  })
})
