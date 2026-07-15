import type { LexicalEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { ContentEditable } from '../src/LexicalContentEditable'
import { PlainTextPlugin } from '../src/LexicalPlainTextPlugin'
import { RichTextPlugin } from '../src/LexicalRichTextPlugin'

type RegisterDragonSupport = (typeof import('@lexical/dragon'))['registerDragonSupport']

const dragonMocks = vi.hoisted(() => ({
  cleanup: vi.fn<() => void>(),
  registerDragonSupport: vi.fn<RegisterDragonSupport>(),
}))

vi.mock('@lexical/dragon', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/dragon')>()),
  registerDragonSupport: dragonMocks.registerDragonSupport,
}))

const onError = (error: Error) => {
  throw error
}

describe.each([
  ['plain-text', PlainTextPlugin],
  ['rich-text', RichTextPlugin],
] as const)('%s Dragon support', (namespace, Plugin) => {
  beforeEach(() => {
    vi.clearAllMocks()
    dragonMocks.registerDragonSupport.mockReturnValue(dragonMocks.cleanup)
  })

  it('registers Dragon support and cleans it up with the editor setup', async () => {
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace, onError } },
      slots: {
        default: () =>
          h(Plugin, null, {
            contentEditable: () => h(ContentEditable),
          }),
      },
    })
    await nextTick()

    expect(dragonMocks.registerDragonSupport).toHaveBeenCalledOnce()
    expect(dragonMocks.registerDragonSupport).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
    )

    wrapper.unmount()
    expect(dragonMocks.cleanup).toHaveBeenCalledOnce()
  })
})
