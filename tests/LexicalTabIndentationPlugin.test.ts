import type { CanIndentPredicate } from '@lexical/extension'
import type { LexicalEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { TabIndentationPlugin } from '../src/LexicalTabIndentationPlugin'

const { cleanup, registerTabIndentation } = vi.hoisted(() => {
  const cleanupMock = vi.fn<() => void>()
  const registerTabIndentationMock = vi.fn<
    (editor: LexicalEditor, maxIndent?: number, canIndent?: CanIndentPredicate) => () => void
  >(() => cleanupMock)

  return { cleanup: cleanupMock, registerTabIndentation: registerTabIndentationMock }
})

vi.mock('@lexical/extension', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/extension')>()),
  registerTabIndentation,
}))

const onError = (error: Error) => {
  throw error
}

const TestEditor = defineComponent({
  props: {
    maxIndent: {
      type: Number,
      default: undefined,
    },
    canIndent: {
      type: Function as PropType<CanIndentPredicate>,
      default: undefined,
    },
  },
  setup(props) {
    return () =>
      h(
        LexicalComposer,
        { initialConfig: { namespace: 'tab-indentation', onError } },
        {
          default: () =>
            h(TabIndentationPlugin, {
              canIndent: props.canIndent,
              maxIndent: props.maxIndent,
            }),
        },
      )
  },
})

describe('TabIndentationPlugin', () => {
  beforeEach(() => {
    cleanup.mockClear()
    registerTabIndentation.mockClear()
  })

  it('registers the default behavior and cleans it up on unmount', async () => {
    const wrapper = mount(TestEditor)
    await nextTick()

    expect(registerTabIndentation).toHaveBeenCalledOnce()
    expect(registerTabIndentation).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
      undefined,
      undefined,
    )

    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('re-registers when maxIndent or canIndent changes', async () => {
    const canIndent = vi.fn<CanIndentPredicate>(() => true)
    const nextCanIndent = vi.fn<CanIndentPredicate>(() => false)
    const wrapper = mount(TestEditor, { props: { canIndent, maxIndent: 2 } })
    await nextTick()

    const editor = registerTabIndentation.mock.calls[0]?.[0]
    expect(registerTabIndentation).toHaveBeenLastCalledWith(editor, 2, canIndent)

    await wrapper.setProps({ canIndent: nextCanIndent, maxIndent: 4 })

    expect(cleanup).toHaveBeenCalledOnce()
    expect(registerTabIndentation).toHaveBeenLastCalledWith(editor, 4, nextCanIndent)

    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })
})
