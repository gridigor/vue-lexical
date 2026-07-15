import type { CollaborationContext } from '../src/LexicalCollaborationContext'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import {
  createCollaborationContext,
  LexicalCollaboration,
  useCollaborationContext,
} from '../src/LexicalCollaborationContext'

describe('LexicalCollaboration context', () => {
  it('creates isolated defaults and accepts explicit identity values', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const generated = createCollaborationContext()
    const explicit = createCollaborationContext('Ada', '#123456')

    expect(generated).toMatchObject({
      color: 'rgb(125, 50, 0)',
      isCollabActive: false,
      name: 'Cat',
    })
    expect(explicit).toMatchObject({ color: '#123456', name: 'Ada' })
    expect(explicit.yjsDocMap).not.toBe(generated.yjsDocMap)
    vi.restoreAllMocks()
  })

  it('provides a custom context and applies plugin identity overrides', () => {
    const context: CollaborationContext = createCollaborationContext('Before', 'red')
    let injected: CollaborationContext | undefined
    const Consumer = defineComponent({
      setup() {
        const contextValue = useCollaborationContext('After', 'blue')
        injected = contextValue
        return () => h('span', contextValue.name)
      },
    })

    const wrapper = mount(LexicalCollaboration, {
      props: { context },
      slots: { default: () => h(Consumer) },
    })

    expect(wrapper.text()).toBe('After')
    expect(injected).toMatchObject(context)
    expect(context.color).toBe('blue')
  })

  it('creates its own context and rejects consumers outside the provider', () => {
    let injected: CollaborationContext | undefined
    const Consumer = defineComponent({
      setup() {
        injected = useCollaborationContext()
        return () => null
      },
    })

    mount(LexicalCollaboration, { slots: { default: () => h(Consumer) } })
    expect(injected).toBeDefined()
    expect(() => mount(Consumer)).toThrow('must be used inside a <LexicalCollaboration>')
  })
})
