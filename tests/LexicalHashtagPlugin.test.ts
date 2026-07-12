import type { LexicalEditor } from 'lexical'
import { HashtagNode } from '@lexical/hashtag'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalErrorBoundary } from '../src/LexicalErrorBoundary'
import { LexicalHashtagPlugin } from '../src/LexicalHashtagPlugin'

type RegisterLexicalHashtag = (typeof import('@lexical/hashtag'))['registerLexicalHashtag']

const mocks = vi.hoisted(() => ({
  cleanup: vi.fn<() => void>(),
  registerLexicalHashtag: vi.fn<RegisterLexicalHashtag>(),
}))

vi.mock('@lexical/hashtag', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/hashtag')>()),
  registerLexicalHashtag: mocks.registerLexicalHashtag,
}))

const onError = (error: Error) => {
  throw error
}

describe('HashtagPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registerLexicalHashtag.mockReturnValue(mocks.cleanup)
  })

  it('registers hashtag transforms and cleans up on unmount', async () => {
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'hashtag-plugin',
          nodes: [HashtagNode],
          onError,
        },
      },
      slots: { default: () => h(LexicalHashtagPlugin) },
    })
    await nextTick()

    expect(mocks.registerLexicalHashtag).toHaveBeenCalledOnce()
    expect(mocks.registerLexicalHashtag).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
    )

    wrapper.unmount()
    expect(mocks.cleanup).toHaveBeenCalledOnce()
  })

  it('reports a missing HashtagNode through an error boundary', async () => {
    const onBoundaryError = vi.fn()
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'missing-hashtag-node', onError } },
      slots: {
        default: () =>
          h(
            LexicalErrorBoundary,
            { onError: onBoundaryError },
            {
              default: () => h(LexicalHashtagPlugin),
              fallback: ({ error }: { error: Error }) =>
                h('span', { 'data-error': '' }, error.message),
            },
          ),
      },
    })
    await nextTick()

    expect(wrapper.get('[data-error]').text()).toBe(
      'LexicalHashtagPlugin: HashtagNode not registered on editor',
    )
    expect(onBoundaryError).toHaveBeenCalledOnce()
    expect(mocks.registerLexicalHashtag).not.toHaveBeenCalled()
  })
})
