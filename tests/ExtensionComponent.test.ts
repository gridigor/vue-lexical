import type { Component } from 'vue'
import { signal, type ReadonlySignal } from '@lexical/extension'
import { defineExtension } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { ExtensionComponent } from '../src/ExtensionComponent'
import { LexicalExtensionComposer } from '../src/LexicalExtensionComposer'
import { VueExtension } from '../src/VueExtension'
import {
  useExtensionComponent,
  useExtensionDependency,
  useOptionalExtensionDependency,
  usePeerExtensionDependency,
} from '../src/useExtensionComponent'
import { useExtensionSignalValue, useSignalValue } from '../src/useExtensionSignalValue'

const OutputComponent = defineComponent({
  name: 'OutputComponent',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      default: 'output',
    },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'extension-output' }, [props.label, slots.default?.()])
  },
})

const CounterExtension = defineExtension({
  build: () => ({ Component: OutputComponent, count: signal(1) }),
  dependencies: [VueExtension],
  name: 'test-counter-extension',
})

const MissingExtension = defineExtension({
  name: 'test-missing-extension',
})

const RootExtension = defineExtension({
  dependencies: [CounterExtension],
  name: 'extension-component-root',
  namespace: 'extension-component-root',
})

describe('extension components and composables', () => {
  it('renders output components and exposes dependencies and signals', async () => {
    let outputComponent: Component | undefined
    let dependency: ReturnType<typeof useExtensionDependency<typeof CounterExtension>> | undefined
    let optionalDependency:
      | ReturnType<typeof useOptionalExtensionDependency<typeof CounterExtension>>
      | undefined
    let missingDependency: ReturnType<
      typeof useOptionalExtensionDependency<typeof MissingExtension>
    >
    let peerDependency: ReturnType<typeof usePeerExtensionDependency<typeof CounterExtension>>

    const CaptureExtension = defineComponent({
      setup() {
        outputComponent = useExtensionComponent(CounterExtension)
        dependency = useExtensionDependency(CounterExtension)
        optionalDependency = useOptionalExtensionDependency(CounterExtension)
        missingDependency = useOptionalExtensionDependency(MissingExtension)
        peerDependency = usePeerExtensionDependency<typeof CounterExtension>(CounterExtension.name)
        const count = useExtensionSignalValue(CounterExtension, 'count')
        return () => h('output', { class: 'signal-value' }, String(count.value))
      },
    })

    const wrapper = mount(LexicalExtensionComposer, {
      props: { extension: RootExtension },
      slots: {
        default: () => [
          h(
            ExtensionComponent,
            { extension: CounterExtension, label: 'configured' },
            { default: () => ' child' },
          ),
          h(CaptureExtension),
        ],
      },
    })

    expect(wrapper.get('.extension-output').text()).toBe('configured child')
    expect(wrapper.get('.signal-value').text()).toBe('1')
    expect(outputComponent).toBe(OutputComponent)
    expect(optionalDependency).toBe(dependency)
    expect(peerDependency).toBe(dependency)
    expect(missingDependency).toBeUndefined()

    dependency!.output.count.value = 2
    await nextTick()
    expect(wrapper.get('.signal-value').text()).toBe('2')
    wrapper.unmount()
  })

  it('subscribes to standalone signals and cleans up with the component scope', () => {
    const unsubscribe = vi.fn()
    const subscribe = vi.fn((callback: (value: number) => void) => {
      callback(8)
      return unsubscribe
    })
    const testSignal = {
      peek: () => 7,
      subscribe,
      value: 7,
    } as unknown as ReadonlySignal<number>
    const SignalConsumer = defineComponent({
      setup() {
        const value = useSignalValue(testSignal)
        return () => h('span', { class: 'standalone-signal' }, String(value.value))
      },
    })

    const wrapper = mount(SignalConsumer)
    expect(wrapper.get('.standalone-signal').text()).toBe('8')
    expect(subscribe).toHaveBeenCalledOnce()
    wrapper.unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
