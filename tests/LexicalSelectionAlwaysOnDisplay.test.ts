import type { LexicalEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectionAlwaysOnDisplay } = vi.hoisted(() => ({
  selectionAlwaysOnDisplay: vi.fn(),
}))

vi.mock('@lexical/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/utils')>()),
  selectionAlwaysOnDisplay,
}))

import { LexicalComposer } from '../src/LexicalComposer'
import { ContentEditable } from '../src/LexicalContentEditable'
import { SelectionAlwaysOnDisplay } from '../src/LexicalSelectionAlwaysOnDisplay'

const onError = (error: Error) => {
  throw error
}

beforeEach(() => {
  selectionAlwaysOnDisplay.mockReset()
})

describe('SelectionAlwaysOnDisplay', () => {
  it('registers the selection marker, forwards repositioning, and cleans up', async () => {
    const cleanup = vi.fn()
    const onReposition = vi.fn()
    selectionAlwaysOnDisplay.mockReturnValue(cleanup)
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: {
          namespace: 'selection-always-visible',
          onError,
        },
      },
      slots: {
        default: () => [h(ContentEditable), h(SelectionAlwaysOnDisplay, { onReposition })],
      },
    })

    await nextTick()
    expect(selectionAlwaysOnDisplay).toHaveBeenCalledOnce()
    const [editor, reposition] = selectionAlwaysOnDisplay.mock.calls[0] as [
      LexicalEditor,
      (nodes: readonly HTMLElement[]) => void,
    ]
    expect(editor.getRootElement()).not.toBeNull()
    const nodes = [document.createElement('mark')]
    reposition(nodes)
    expect(onReposition).toHaveBeenCalledWith(nodes)

    await wrapper.setProps({})
    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledOnce()
  })

  it('allows the reposition callback to be omitted', async () => {
    selectionAlwaysOnDisplay.mockReturnValue(vi.fn())
    const wrapper = mount(LexicalComposer, {
      props: {
        initialConfig: { namespace: 'selection-no-callback', onError },
      },
      slots: { default: () => h(SelectionAlwaysOnDisplay) },
    })
    await nextTick()
    const reposition = selectionAlwaysOnDisplay.mock.calls[0]?.[1]
    reposition?.([])
    wrapper.unmount()
  })
})
