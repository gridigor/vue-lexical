import type { LexicalEditor } from 'lexical'
import { HorizontalRuleNode } from '@lexical/extension'
import { HEADING, TRANSFORMERS, type Transformer } from '@lexical/markdown'
import { mount } from '@vue/test-utils'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import {
  DEFAULT_TRANSFORMERS,
  LexicalMarkdownShortcutPlugin,
} from '../src/LexicalMarkdownShortcutPlugin'

type RegisterMarkdownShortcuts = (typeof import('@lexical/markdown'))['registerMarkdownShortcuts']

const mocks = vi.hoisted(() => ({
  cleanup: vi.fn<() => void>(),
  registerMarkdownShortcuts: vi.fn<RegisterMarkdownShortcuts>(),
}))

vi.mock('@lexical/markdown', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/markdown')>()),
  registerMarkdownShortcuts: mocks.registerMarkdownShortcuts,
}))

const onError = (error: Error) => {
  throw error
}

const TestEditor = defineComponent({
  props: {
    transformers: {
      type: Array as PropType<Transformer[]>,
      default: undefined,
    },
  },
  setup: (props) => () =>
    h(
      LexicalComposer,
      { initialConfig: { namespace: 'markdown-shortcuts', onError } },
      {
        default: () =>
          h(
            LexicalMarkdownShortcutPlugin,
            props.transformers === undefined ? {} : { transformers: props.transformers },
          ),
      },
    ),
})

describe('MarkdownShortcutPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registerMarkdownShortcuts.mockReturnValue(mocks.cleanup)
  })

  it('uses the official transformers with horizontal rules by default', async () => {
    const wrapper = mount(TestEditor)
    await nextTick()

    expect(DEFAULT_TRANSFORMERS.slice(1)).toEqual(TRANSFORMERS)
    expect(DEFAULT_TRANSFORMERS[0]).toEqual(
      expect.objectContaining({
        dependencies: [HorizontalRuleNode],
        triggerOnEnter: true,
        type: 'element',
      }),
    )
    expect(mocks.registerMarkdownShortcuts).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
      DEFAULT_TRANSFORMERS,
    )

    wrapper.unmount()
    expect(mocks.cleanup).toHaveBeenCalledOnce()
  })

  it('re-registers when the transformer collection changes', async () => {
    const wrapper = mount(TestEditor, { props: { transformers: [HEADING] } })
    await nextTick()
    const editor = mocks.registerMarkdownShortcuts.mock.calls[0]?.[0]
    const nextTransformers: Transformer[] = []

    await wrapper.setProps({ transformers: nextTransformers })

    expect(mocks.cleanup).toHaveBeenCalledOnce()
    expect(mocks.registerMarkdownShortcuts).toHaveBeenLastCalledWith(editor, nextTransformers)

    wrapper.unmount()
    expect(mocks.cleanup).toHaveBeenCalledTimes(2)
  })
})
