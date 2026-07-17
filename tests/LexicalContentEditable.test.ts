import type { LexicalEditor } from 'lexical'
import { createEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import {
  ContentEditable,
  ContentEditableElement,
  type ContentEditableElementProps,
  type ContentEditableProps,
} from '../src/LexicalContentEditable'

const onError = (error: Error) => {
  throw error
}

function createTestEditor(namespace: string): LexicalEditor {
  return createEditor({ namespace, onError })
}

describe('ContentEditableElement', () => {
  it('binds an explicit editor and renders Vue and compatibility ARIA props', async () => {
    const editor = createTestEditor('content-editable-element')
    const props: ContentEditableElementProps = {
      editor,
      ariaActiveDescendant: 'active-option',
      ariaAutoComplete: 'list',
      ariaControls: 'option-list',
      ariaDescribedBy: 'description',
      ariaErrorMessage: 'error-message',
      ariaExpanded: true,
      ariaInvalid: 'false',
      ariaLabel: 'Editor label',
      ariaLabelledBy: 'compatibility-label',
      ariaMultiline: true,
      ariaOwns: 'owned-list',
      ariaRequired: true,
      role: 'combobox',
    }
    const wrapper = mount(ContentEditableElement, {
      props,
      attrs: {
        'aria-labelledby': 'preferred-label',
        'data-custom': 'custom-value',
        spellcheck: false,
      },
    })
    await nextTick()

    const element = wrapper.element as HTMLElement
    expect(editor.getRootElement()).toBe(element)
    expect(element.getAttribute('contenteditable')).toBe('true')
    expect(element.getAttribute('role')).toBe('combobox')
    expect(element.getAttribute('spellcheck')).toBe('false')
    expect(element.getAttribute('aria-activedescendant')).toBe('active-option')
    expect(element.getAttribute('aria-autocomplete')).toBe('list')
    expect(element.getAttribute('aria-controls')).toBe('option-list')
    expect(element.getAttribute('aria-describedby')).toBe('description')
    expect(element.getAttribute('aria-errormessage')).toBe('error-message')
    expect(element.getAttribute('aria-expanded')).toBe('true')
    expect(element.getAttribute('aria-invalid')).toBe('false')
    expect(element.getAttribute('aria-label')).toBe('Editor label')
    expect(element.getAttribute('aria-labelledby')).toBe('preferred-label')
    expect(element.getAttribute('aria-multiline')).toBe('true')
    expect(element.getAttribute('aria-owns')).toBe('owned-list')
    expect(element.getAttribute('aria-required')).toBe('true')
    expect(element.getAttribute('data-custom')).toBe('custom-value')
    expect(element.hasAttribute('aria-readonly')).toBe(false)
    expect(element.hasAttribute('tabindex')).toBe(false)

    editor.setEditable(false)
    await nextTick()

    expect(element.getAttribute('contenteditable')).toBe('false')
    expect(element.getAttribute('aria-autocomplete')).toBe('none')
    expect(element.getAttribute('aria-readonly')).toBe('true')
    expect(element.hasAttribute('aria-activedescendant')).toBe(false)
    expect(element.hasAttribute('aria-controls')).toBe(false)
    expect(element.hasAttribute('aria-expanded')).toBe(false)
    expect(element.hasAttribute('aria-owns')).toBe(false)
    expect(element.getAttribute('aria-describedby')).toBe('description')
    expect(element.getAttribute('tabindex')).toBe('-1')

    wrapper.unmount()
    expect(editor.getRootElement()).toBeNull()
  })

  it('supports a custom element and preserves a replacement root during cleanup', async () => {
    const editor = createTestEditor('custom-content-editable-element')
    const wrapper = mount(ContentEditableElement, {
      props: { as: 'section', editor },
      attrs: { tabindex: 2 },
    })
    await nextTick()
    const replacement = document.createElement('article')

    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.attributes('role')).toBe('textbox')
    expect(wrapper.attributes('spellcheck')).toBe('true')

    editor.setEditable(false)
    await nextTick()
    expect(wrapper.attributes('tabindex')).toBe('2')

    editor.setRootElement(replacement)
    wrapper.unmount()
    expect(editor.getRootElement()).toBe(replacement)
    editor.setRootElement(null)
  })

  it('keeps a hyphenated aria-expanded value for a combobox', async () => {
    const editor = createTestEditor('hyphenated-expanded')
    const wrapper = mount(ContentEditableElement, {
      props: { editor },
      attrs: { 'aria-expanded': 'false', role: 'combobox' },
    })
    await nextTick()

    expect(wrapper.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })
})

describe('ContentEditable', () => {
  it('reads the editor from context and exposes editable state to its placeholder slot', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })
    const contentEditableProps: ContentEditableProps = { 'aria-label': 'Context editor' }
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'context-content-editable', onError } },
      slots: {
        default: () => [
          h(ContentEditable, contentEditableProps, {
            placeholder: ({ isEditable }: { isEditable: boolean }) =>
              h('span', { 'data-editable': String(isEditable) }, 'Start writing'),
          }),
          h(CaptureEditor),
        ],
      },
    })
    await nextTick()

    expect(wrapper.get('[contenteditable]').attributes('aria-label')).toBe('Context editor')
    expect(wrapper.get('[data-editable]').attributes('data-editable')).toBe('true')

    editor?.setEditable(false)
    await nextTick()
    expect(wrapper.get('[data-editable]').attributes('data-editable')).toBe('false')
  })
})
