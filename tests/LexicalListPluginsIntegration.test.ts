import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import {
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { LexicalCheckListPlugin } from '../src/LexicalCheckListPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import { LexicalListPlugin } from '../src/LexicalListPlugin'

const onError = (error: Error) => {
  throw error
}

function mountListEditor() {
  const editorRef = shallowRef<LexicalEditor | null>()
  const wrapper = mount(LexicalComposer, {
    props: {
      initialConfig: {
        editorState: () => {
          const paragraph = $createParagraphNode().append($createTextNode('List item'))
          $getRoot().append(paragraph)
          paragraph.selectStart()
        },
        namespace: 'list-integration',
        nodes: [ListNode, ListItemNode],
        onError,
      },
    },
    slots: {
      default: () => [
        h(LexicalContentEditable, { ariaLabel: 'List editor' }),
        h(EditorRefPlugin, { editorRef }),
        h(LexicalListPlugin),
        h(LexicalCheckListPlugin),
      ],
    },
  })

  return { editorRef, wrapper }
}

function getListDetails(editor: LexicalEditor) {
  return editor.getEditorState().read(() => {
    const list = $getRoot().getFirstChildOrThrow()
    if (!$isListNode(list)) {
      return null
    }
    const item = list.getFirstChildOrThrow()
    return {
      checked: $isListItemNode(item) ? item.getChecked() : undefined,
      type: list.getListType(),
    }
  })
}

describe('list plugins integration', () => {
  it('creates ordered and unordered lists and removes list formatting', async () => {
    const { editorRef, wrapper } = mountListEditor()
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getListDetails(editor)).toEqual({ checked: undefined, type: 'number' })

    expect(editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getListDetails(editor)).toEqual({ checked: undefined, type: 'bullet' })

    expect(editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getListDetails(editor)).toBeNull()

    wrapper.unmount()
    expect(editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)).toBe(false)
  })

  it('creates and toggles a check-list item through its DOM interaction', async () => {
    const { editorRef, wrapper } = mountListEditor()
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)).toBe(true)
    await nextTick()
    expect(getListDetails(editor)).toEqual({ checked: false, type: 'check' })

    const listItem = wrapper.get('li')
    vi.spyOn(listItem.element, 'getBoundingClientRect').mockReturnValue({
      bottom: 20,
      height: 20,
      left: 0,
      right: 100,
      toJSON: () => ({}),
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    })
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (property: string) => (property === 'zoom' ? '1' : ''),
      width: '20px',
    } as CSSStyleDeclaration)

    await listItem.trigger('click', { clientX: 10 })
    await nextTick()

    expect(getListDetails(editor)).toEqual({ checked: true, type: 'check' })
    expect(listItem.attributes('aria-checked')).toBe('true')

    wrapper.unmount()
    expect(editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)).toBe(false)
  })
})
