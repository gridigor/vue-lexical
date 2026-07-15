import type {
  AnyLexicalExtension,
  ExtensionConfigBase,
  LexicalEditor,
  LexicalExtension,
  LexicalExtensionOutput,
} from 'lexical'
import type { App, Component, VNodeChild } from 'vue'
import {
  effect,
  getExtensionDependencyFromEditor,
  signal,
  type Signal,
  untracked,
} from '@lexical/extension'
import {
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  mergeRegister,
} from 'lexical'
import { Teleport, createApp, defineComponent, h, onUnmounted, shallowRef } from 'vue'
import { type LexicalComposerContext, useLexicalComposer } from './LexicalComposerContext'
import { LexicalErrorBoundary } from './LexicalErrorBoundary'
import { VueExtension } from './VueExtension'
import { VueProviderExtension } from './VueProviderExtension'

export interface VuePluginHostDecoratorProps {
  context: LexicalComposerContext
}

export interface MountVuePluginCommandArg {
  component: Component | null
  domNode?: Element | DocumentFragment | null
  key: string
  props?: Record<string, unknown>
  slots?: Record<string, () => VNodeChild>
  vnode?: VNodeChild
}

export interface VuePluginHostMountCommandArg {
  container: Element | string
}

export const VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND = createCommand<VuePluginHostMountCommandArg>(
  'VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND',
)

export const VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND = createCommand<MountVuePluginCommandArg>(
  'VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND',
)

export interface VuePluginHostOutput {
  mountVuePlugin: (arg: MountVuePluginCommandArg) => void
  mountVuePluginHost: (container: Element | string) => void
  mountedPlugins: Signal<Map<string, MountVuePluginCommandArg>>
}

const VuePluginHostDecorator: Component = defineComponent({
  name: 'VuePluginHostDecorator',
  setup() {
    const editor = useLexicalComposer()
    const { mountedPlugins } = getExtensionDependencyFromEditor(
      editor,
      VuePluginHostExtension,
    ).output
    const plugins = shallowRef(mountedPlugins.peek())
    const stopEffect = effect(() => {
      plugins.value = mountedPlugins.value
    })
    onUnmounted(stopEffect)

    return () =>
      [...plugins.value.values()].map((plugin) => {
        if (plugin.component === null && plugin.vnode == null) {
          return null
        }

        const content = h(
          LexicalErrorBoundary,
          {
            key: plugin.key,
            onError(error: Error) {
              editor._onError(error)
            },
          },
          {
            default: () =>
              plugin.vnode === undefined
                ? h(plugin.component!, plugin.props, plugin.slots)
                : plugin.vnode,
          },
        )

        return plugin.domNode
          ? h(Teleport, { key: plugin.key, to: plugin.domNode }, content)
          : content
      })
  },
})

const vuePluginHostExtensionName = '@gridigor/vue-lexical/VuePluginHost' as const

export const VuePluginHostExtension: LexicalExtension<
  ExtensionConfigBase,
  typeof vuePluginHostExtensionName,
  VuePluginHostOutput,
  undefined
> = defineExtension({
  build(editor) {
    const mountedPlugins = signal(new Map<string, MountVuePluginCommandArg>())
    return {
      mountVuePlugin(arg: MountVuePluginCommandArg) {
        editor.dispatchCommand(VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND, arg)
      },
      mountVuePluginHost(container: Element | string) {
        editor.dispatchCommand(VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND, { container })
      },
      mountedPlugins,
    }
  },
  dependencies: [
    VueProviderExtension,
    configExtension(VueExtension, { decorators: [VuePluginHostDecorator] }),
  ],
  name: vuePluginHostExtensionName,
  register(editor, _config, state) {
    let app: App<Element> | undefined
    const { mountedPlugins } = state.getOutput()
    const { Component: EditorComponent } = state.getDependency(VueExtension).output

    return mergeRegister(
      () => {
        app?.unmount()
        untracked(() => {
          mountedPlugins.value = new Map()
        })
      },
      editor.registerCommand(
        VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND,
        (arg) => {
          untracked(() => {
            const plugins = new Map(mountedPlugins.value)
            plugins.set(arg.key, arg)
            mountedPlugins.value = plugins
          })
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND,
        ({ container }) => {
          if (app !== undefined) {
            throw new Error('VuePluginHostExtension: host is already mounted.')
          }
          app = createApp({
            name: 'LexicalVuePluginHostRoot',
            render: () => h(EditorComponent, { contentEditable: null }),
          })
          app.mount(container)
          return true
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    )
  },
})

export function mountVuePluginHost(editor: LexicalEditor, container: Element | string): void {
  getExtensionDependencyFromEditor(editor, VuePluginHostExtension).output.mountVuePluginHost(
    container,
  )
}

export function mountVuePluginComponent(
  editor: LexicalEditor,
  options: MountVuePluginCommandArg,
): void {
  getExtensionDependencyFromEditor(editor, VuePluginHostExtension).output.mountVuePlugin(options)
}

/** Mounts an already-created Vue VNode in the editor's plugin host. */
export function mountVuePluginElement(
  editor: LexicalEditor,
  options: Omit<MountVuePluginCommandArg, 'component' | 'props' | 'slots' | 'vnode'> & {
    element: VNodeChild
  },
): void {
  const { element, ...pluginOptions } = options
  mountVuePluginComponent(editor, { ...pluginOptions, component: null, vnode: element })
}

export function mountVueExtensionComponent<Extension extends AnyLexicalExtension>(
  editor: LexicalEditor,
  options: {
    domNode?: Element | DocumentFragment | null
    extension: Extension
    key: string
    props?: [LexicalExtensionOutput<Extension>] extends [{ Component: Component }]
      ? Record<string, unknown>
      : never
    slots?: Record<string, () => VNodeChild>
  },
): void {
  const { extension, ...pluginOptions } = options
  const { Component } = getExtensionDependencyFromEditor(editor, extension).output as {
    Component: Component
  }
  mountVuePluginComponent(editor, { ...pluginOptions, component: Component })
}
