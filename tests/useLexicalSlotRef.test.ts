import type { LexicalEditor } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const slotMocks = vi.hoisted(() => ({
  mount: vi.fn(),
  unmount: vi.fn(),
}))

vi.mock('lexical', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lexical')>()),
  mountSlotContainer: slotMocks.mount,
  unmountSlotContainer: slotMocks.unmount,
}))

import { useLexicalSlotRef } from '../src/useLexicalSlotRef'
import type { LexicalElementRef } from '../src/useLexicalExtensionElementRef'

describe('useLexicalSlotRef', () => {
  it('mounts, refreshes, detaches, and disposes a Lexical slot container', () => {
    const editor = {} as LexicalEditor
    const container = document.createElement('div')
    slotMocks.mount.mockReturnValue(container)
    let slotRef: LexicalElementRef | undefined
    const Harness = defineComponent({
      setup() {
        slotRef = useLexicalSlotRef(editor, 'node-key', 'toolbar')
        return () => h('div', { ref: slotRef })
      },
    })

    const wrapper = mount(Harness)
    const target = wrapper.element as HTMLElement
    expect(slotMocks.mount).toHaveBeenCalledWith(editor, 'node-key', 'toolbar', target)

    slotRef?.(target)
    expect(slotMocks.unmount).toHaveBeenCalledWith(editor, 'node-key', container)
    expect(slotMocks.mount).toHaveBeenCalledTimes(2)

    slotRef?.(null)
    expect(slotMocks.unmount).toHaveBeenCalledTimes(2)

    slotMocks.mount.mockReturnValue(null)
    slotRef?.(target)
    wrapper.unmount()
    expect(slotMocks.unmount).toHaveBeenCalledTimes(2)
  })

  it('unmounts an attached slot when its component scope is disposed', () => {
    const editor = {} as LexicalEditor
    const container = document.createElement('div')
    slotMocks.mount.mockReturnValue(container)
    const Harness = defineComponent({
      setup() {
        return () => h('div', { ref: useLexicalSlotRef(editor, 'node-key', 'content') })
      },
    })

    const wrapper = mount(Harness)
    wrapper.unmount()
    expect(slotMocks.unmount).toHaveBeenCalledWith(editor, 'node-key', container)
  })

  it('accepts an HTML element from another document', () => {
    const editor = {} as LexicalEditor
    const container = document.createElement('div')
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const target = iframe.contentDocument!.createElement('div')
    slotMocks.mount.mockReturnValue(container)
    let slotRef: LexicalElementRef | undefined
    const Harness = defineComponent({
      setup() {
        slotRef = useLexicalSlotRef(editor, 'node-key', 'iframe-slot')
        return () => null
      },
    })

    const wrapper = mount(Harness)
    slotRef?.(target)
    expect(slotMocks.mount).toHaveBeenCalledWith(editor, 'node-key', 'iframe-slot', target)
    wrapper.unmount()
    iframe.remove()
  })
})
