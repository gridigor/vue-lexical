import type { LexicalEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { LexicalErrorBoundary } from '../src/LexicalErrorBoundary'

describe('LexicalErrorBoundary', () => {
  it('renders a fallback and can recover the failed subtree', async () => {
    const shouldThrow = ref(true)
    const onError = vi.fn()
    const ThrowingView = defineComponent({
      name: 'ThrowingView',
      setup() {
        return () => {
          if (shouldThrow.value) {
            throw new Error('Broken decorator view')
          }

          return h('span', { 'data-testid': 'recovered' }, 'Recovered')
        }
      },
    })

    const wrapper = mount(LexicalErrorBoundary, {
      props: { onError },
      slots: {
        default: () => h(ThrowingView),
        fallback: ({ error, errorInfo, reset }) =>
          h(
            'button',
            {
              'data-testid': 'fallback',
              onClick: () => {
                shouldThrow.value = false
                reset()
              },
            },
            `${error.message}: ${errorInfo}`,
          ),
      },
    })

    await nextTick()

    expect(wrapper.get('[data-testid="fallback"]').text()).toContain('Broken decorator view')
    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)

    await wrapper.get('[data-testid="fallback"]').trigger('click')

    expect(wrapper.get('[data-testid="recovered"]').text()).toBe('Recovered')
  })

  it('normalizes non-Error values and renders the default fallback', async () => {
    const onError = vi.fn()
    const ThrowString = defineComponent({
      name: 'ThrowString',
      setup() {
        return () => {
          throw 'string failure'
        }
      },
    })

    const wrapper = mount(LexicalErrorBoundary, {
      props: { onError },
      slots: { default: () => h(ThrowString) },
    })

    await nextTick()

    expect(wrapper.get('[role="alert"]').text()).toBe('An error was thrown.')
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ message: 'string failure' })
  })

  it('leaves editor update errors to the composer onError handler', async () => {
    const editorError = new Error('Lexical update failed')
    const composerOnError = vi.fn((_error: Error, _editor: LexicalEditor) => {})
    const boundaryOnError = vi.fn()
    const FailingPlugin = defineComponent({
      name: 'FailingPlugin',
      setup() {
        const editor = useLexicalComposer()

        onMounted(() => {
          editor.update(
            () => {
              throw editorError
            },
            { discrete: true },
          )
        })

        return () => null
      },
    })

    mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'error-boundary-editor',
          onError: composerOnError,
        },
      },
      slots: {
        default: () =>
          h(
            LexicalErrorBoundary,
            { onError: boundaryOnError },
            { default: () => h(FailingPlugin) },
          ),
      },
    })

    await nextTick()

    expect(composerOnError).toHaveBeenCalledOnce()
    expect(composerOnError.mock.calls[0]?.[0]).toBe(editorError)
    expect(boundaryOnError).not.toHaveBeenCalled()
  })
})
