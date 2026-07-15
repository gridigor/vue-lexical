import { getExtensionDependencyFromEditor, LexicalBuilder } from '@lexical/extension'
import { defineExtension } from 'lexical'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VueExtension } from '../src/VueExtension'
import {
  mountVueExtensionComponent,
  mountVuePluginComponent,
  mountVuePluginHost,
  VuePluginHostExtension,
} from '../src/VuePluginHostExtension'

const hostContainers: Element[] = []

afterEach(() => {
  hostContainers.splice(0).forEach((container) => container.remove())
})

const HostedOutputComponent = defineComponent({
  name: 'HostedOutputComponent',
  props: {
    message: {
      type: String,
      default: 'extension',
    },
  },
  setup(props) {
    return () => h('strong', { class: 'hosted-extension' }, props.message)
  },
})

const HostedOutputExtension = defineExtension({
  build: () => ({ Component: HostedOutputComponent }),
  dependencies: [VueExtension],
  name: 'hosted-output-extension',
})

function createHostContainer(className: string): HTMLDivElement {
  const container = document.createElement('div')
  container.className = className
  document.body.append(container)
  hostContainers.push(container)
  return container
}

describe('VuePluginHostExtension', () => {
  it('mounts, updates, teleports, and unmounts Vue extension components', async () => {
    const onError = vi.fn()
    const root = defineExtension({
      dependencies: [VuePluginHostExtension, HostedOutputExtension],
      name: 'vue-plugin-host-root',
      namespace: 'vue-plugin-host-root',
      onError,
    })
    const editor = LexicalBuilder.fromExtensions([root]).buildEditor()
    const host = createHostContainer('plugin-host')
    const teleportTarget = createHostContainer('plugin-teleport-target')
    const PluginComponent = defineComponent({
      name: 'PluginComponent',
      props: {
        message: {
          type: String,
          required: true,
        },
      },
      setup(props, { slots }) {
        return () => h('span', { class: 'hosted-plugin' }, [props.message, slots.default?.()])
      },
    })

    mountVuePluginHost(editor, host)
    expect(editor.getRootElement()).toBeNull()
    mountVuePluginComponent(editor, {
      component: PluginComponent,
      key: 'plugin',
      props: { message: 'first' },
      slots: { default: () => ' slot' },
    })
    mountVuePluginComponent(editor, {
      component: PluginComponent,
      domNode: teleportTarget,
      key: 'teleported',
      props: { message: 'away' },
    })
    mountVueExtensionComponent(editor, {
      extension: HostedOutputExtension,
      key: 'extension',
      props: { message: 'from extension' },
    })
    await nextTick()

    expect(host.querySelector('.hosted-plugin')?.textContent).toBe('first slot')
    expect(host.querySelector('.hosted-extension')?.textContent).toBe('from extension')
    expect(teleportTarget.querySelector('.hosted-plugin')?.textContent).toBe('away')

    mountVuePluginComponent(editor, {
      component: PluginComponent,
      key: 'plugin',
      props: { message: 'updated' },
    })
    mountVuePluginComponent(editor, { component: null, key: 'extension' })
    await nextTick()
    expect(host.querySelector('.hosted-plugin')?.textContent).toBe('updated')
    expect(host.querySelector('.hosted-extension')).toBeNull()

    mountVuePluginHost(editor, createHostContainer('duplicate-host'))
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'VuePluginHostExtension: host is already mounted.' }),
      editor,
    )
    onError.mockClear()

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const BrokenPlugin = defineComponent({
      setup: () => () => {
        throw new Error('hosted component failed')
      },
    })
    mountVuePluginComponent(editor, { component: BrokenPlugin, key: 'broken' })
    await nextTick()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'hosted component failed' }),
      editor,
    )
    consoleError.mockRestore()

    const output = getExtensionDependencyFromEditor(editor, VuePluginHostExtension).output
    expect(output.mountedPlugins.peek().size).toBeGreaterThan(0)
    editor.dispose()
    expect(output.mountedPlugins.peek().size).toBe(0)
    expect(host.innerHTML).toBe('')
    expect(teleportTarget.innerHTML).toBe('')
  })
})
