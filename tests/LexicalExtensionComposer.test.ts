import type { LexicalEditor, LexicalEditorWithDispose } from 'lexical'
import { getExtensionDependencyFromEditor, LexicalBuilder } from '@lexical/extension'
import { defineExtension } from 'lexical'
import { mount } from '@vue/test-utils'
import { Fragment, defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LexicalExtensionComposer } from '../src/LexicalExtensionComposer'
import { LexicalExtensionEditorComposer } from '../src/LexicalExtensionEditorComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import {
  configureVueExtension,
  DefaultEditorChildrenComponent,
  VueExtension,
} from '../src/VueExtension'
import { VueProviderExtension } from '../src/VueProviderExtension'

const mountedEditors: LexicalEditorWithDispose[] = []

afterEach(() => {
  mountedEditors.splice(0).forEach((editor) => editor.dispose())
})

function createRootExtension(name: string, cleanup = vi.fn()) {
  return {
    cleanup,
    extension: defineExtension({
      name,
      namespace: name,
      onError(error) {
        throw error
      },
      register: () => cleanup,
    }),
  }
}

describe('Lexical extension composers', () => {
  it('builds, provides, replaces, and disposes extension editors', async () => {
    const first = createRootExtension('extension-composer-first')
    const second = createRootExtension('extension-composer-second')
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })

    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: first.extension },
      slots: { default: () => h(CaptureEditor) },
    })
    await nextTick()

    const firstEditor = editor
    expect(firstEditor).toBeDefined()
    expect(wrapper.get('[contenteditable="true"]').attributes('role')).toBe('textbox')
    expect(getExtensionDependencyFromEditor(firstEditor!, VueExtension).output.context[0]).toBe(
      firstEditor,
    )

    await wrapper.setProps({ extension: second.extension })
    expect(first.cleanup).toHaveBeenCalledOnce()
    expect(editor).not.toBe(firstEditor)

    wrapper.unmount()
    expect(second.cleanup).toHaveBeenCalledOnce()
  })

  it('supports custom and disabled content editable rendering', async () => {
    const root = createRootExtension('extension-content-editable')
    const wrapper = mount(LexicalExtensionComposer, {
      props: {
        contentEditable: () => h('div', { class: 'custom-editable' }),
        extension: root.extension,
      },
    })
    expect(wrapper.get('.custom-editable').element).toBeInstanceOf(HTMLDivElement)

    await wrapper.setProps({ contentEditable: null })
    expect(wrapper.find('.custom-editable').exists()).toBe(false)
    expect(root.cleanup).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('merges Vue decorators and supports a custom editor children renderer', () => {
    const FirstDecorator = defineComponent({
      name: 'FirstDecorator',
      setup: () => () => h('span', { class: 'first-decorator' }),
    })
    const SecondDecorator = defineComponent({
      name: 'SecondDecorator',
      setup: () => () => h('span', { class: 'second-decorator' }),
    })
    const FirstDecoratorExtension = defineExtension({
      dependencies: [configureVueExtension({ decorators: [FirstDecorator] })],
      name: 'first-vue-decorator',
    })
    const EmptyDecoratorExtension = defineExtension({
      dependencies: [configureVueExtension({ decorators: [] })],
      name: 'empty-vue-decorator',
    })
    const root = defineExtension({
      dependencies: [
        FirstDecoratorExtension,
        EmptyDecoratorExtension,
        configureVueExtension({
          EditorChildrenComponent: ({ children, contentEditable }) =>
            h('section', { class: 'editor-children' }, [contentEditable, children]),
          decorators: [SecondDecorator],
        }),
      ],
      name: 'extension-decorators',
      namespace: 'extension-decorators',
    })

    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: root },
      slots: { default: () => h('span', { class: 'child' }) },
    })

    expect(wrapper.get('.editor-children').element).toBeInstanceOf(HTMLElement)
    expect(wrapper.get('.child').text()).toBe('')
    expect(wrapper.get('.first-decorator').element).toBeInstanceOf(HTMLElement)
    expect(wrapper.get('.second-decorator').element).toBeInstanceOf(HTMLElement)
    expect(
      DefaultEditorChildrenComponent({ children: 'child', contentEditable: 'editable' }),
    ).toEqual(expect.objectContaining({ type: Fragment }))
    wrapper.unmount()
  })

  it('requires a Vue provider for VueExtension', () => {
    expect(() => LexicalBuilder.fromExtensions([VueExtension]).buildEditor()).toThrow(
      'No VueProviderExtension detected',
    )
  })

  it('routes captured Vue errors through the editor error handler', async () => {
    const onError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const BrokenChild = defineComponent({
      setup() {
        return () => {
          throw new Error('extension child failed')
        }
      },
    })
    const root = defineExtension({
      name: 'extension-error',
      namespace: 'extension-error',
      onError,
    })

    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: root },
      slots: { default: () => h(BrokenChild) },
    })
    await nextTick()

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'extension child failed' }),
      expect.anything(),
    )
    wrapper.unmount()
    consoleError.mockRestore()
  })

  it('hosts an existing extension editor without owning its lifecycle', () => {
    const root = createRootExtension('extension-existing-editor')
    const editor = LexicalBuilder.fromExtensions([
      VueProviderExtension,
      VueExtension,
      root.extension,
    ]).buildEditor()
    mountedEditors.push(editor)
    const dispose = vi.spyOn(editor, 'dispose')
    let injectedEditor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        injectedEditor = useLexicalComposer()
        return () => null
      },
    })

    const wrapper = mount(LexicalExtensionEditorComposer, {
      props: { initialEditor: editor },
      slots: { default: () => h(CaptureEditor) },
    })
    expect(injectedEditor).toBe(editor)
    wrapper.unmount()
    expect(dispose).not.toHaveBeenCalled()
  })
})
