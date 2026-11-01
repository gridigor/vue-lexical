import { $isLinkNode, AutoLinkNode, LinkNode } from '@lexical/link'
import {
  $getNodeByKey,
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  mergeRegister,
  PASTE_TAG,
  type CommandListenerPriority,
  type NodeKey,
} from 'lexical'
import type { PropType, SlotsType, VNode } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, shallowRef } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { NodeMenuPlugin } from './LexicalNodeMenuPlugin'
import type { MenuSlotProps } from './menu/LexicalMenu'
import type { MenuOption } from './LexicalMenuOption'
import {
  AutoEmbedOption,
  INSERT_EMBED_COMMAND,
  type EmbedConfig,
  type EmbedMatchResult,
} from './LexicalAutoEmbedPluginUtils'

export {
  AutoEmbedOption,
  INSERT_EMBED_COMMAND,
  URL_MATCHER,
  type EmbedConfig,
  type EmbedMatchResult,
} from './LexicalAutoEmbedPluginUtils'

export interface AutoEmbedPluginProps<TEmbedConfig extends EmbedConfig = EmbedConfig> {
  disableMenuFor?: (linkNode: LinkNode) => boolean
  embedConfigs: readonly TEmbedConfig[]
  getMenuOptions: (
    activeEmbedConfig: TEmbedConfig,
    embed: () => void,
    dismiss: () => void,
  ) => readonly AutoEmbedOption[]
  menuCommandPriority?: CommandListenerPriority
  onOpenEmbedModalForConfig?: (embedConfig: TEmbedConfig) => void
}

export const AutoEmbedPlugin = defineComponent({
  name: 'LexicalAutoEmbedPlugin',
  props: {
    disableMenuFor: Function as PropType<(linkNode: LinkNode) => boolean>,
    embedConfigs: {
      type: Array as unknown as PropType<readonly EmbedConfig[]>,
      required: true,
    },
    getMenuOptions: {
      type: Function as PropType<AutoEmbedPluginProps['getMenuOptions']>,
      required: true,
    },
    menuCommandPriority: {
      type: Number as PropType<CommandListenerPriority>,
      default: COMMAND_PRIORITY_LOW,
    },
    onOpenEmbedModalForConfig: Function as PropType<(embedConfig: EmbedConfig) => void>,
  },
  slots: Object as SlotsType<{
    default?: (props: MenuSlotProps<AutoEmbedOption>) => VNode[]
  }>,
  setup(props, { slots }) {
    const editor = useLexicalComposer()
    const currentLink = (key: NodeKey, url: string): LinkNode | null => {
      const node = $getNodeByKey(key)
      return $isLinkNode(node) && node.isAttached() && node.getURL() === url ? node : null
    }
    const isMenuDisabledFor = (link: LinkNode) =>
      props.disableMenuFor != null && props.disableMenuFor(link)
    const nodeKey = shallowRef<NodeKey | null>(null)
    const activeEmbedConfig = shallowRef<EmbedConfig | null>(null)
    const activeUrl = shallowRef<string | null>(null)
    const activeResult = shallowRef<EmbedMatchResult | null>(null)
    const options = shallowRef<readonly AutoEmbedOption[]>([])
    let unregisterMutations: (() => void) | undefined
    let unregisterCommand: (() => void) | undefined
    let checkSequence = 0

    const reset = () => {
      checkSequence += 1
      nodeKey.value = null
      activeEmbedConfig.value = null
      activeUrl.value = null
      activeResult.value = null
      options.value = []
    }

    const refreshOptions = (config: EmbedConfig) => {
      options.value = props.getMenuOptions(config, embedLink, reset)
    }

    const embedLink = () => {
      const config = activeEmbedConfig.value
      const key = nodeKey.value
      const url = activeUrl.value
      const result = activeResult.value
      if (config === null || key === null || url === null || result === null) return
      editor.update(() => {
        // Defensive: a destroyed or re-pointed link resets the plugin before
        // this runs, so the guard above normally catches it first.
        const link = currentLink(key, url)
        if (link !== null) {
          if ($getSelection() === null) link.selectEnd()
          config.insertNode(editor, result)
          if (link.isAttached()) link.remove()
        }
      })
    }

    const checkIfLinkNodeIsEmbeddable = async (key: NodeKey) => {
      const sequence = ++checkSequence
      const url = editor.read('latest', () => {
        const node = $getNodeByKey(key)
        return $isLinkNode(node) && !isMenuDisabledFor(node) ? node.getURL() : undefined
      })
      if (url === undefined) return

      const configs = props.embedConfigs
      for (let index = configs.length - 1; index >= 0; index -= 1) {
        const config = configs[index]!
        // Sequential on purpose: the search stops at the first match from the
        // end, so parseUrl is not called for configs that cannot win.
        // oxlint-disable-next-line no-await-in-loop
        const match = await Promise.resolve(config.parseUrl(url))
        if (sequence !== checkSequence) return
        if (match === null) continue

        // Edits made while parseUrl was pending may not be committed yet, and
        // the link may have moved into a disabled location since.
        const stillEmbeddable = editor.read('pending', () => {
          const link = currentLink(key, url)
          return link !== null && !isMenuDisabledFor(link)
        })
        if (stillEmbeddable) {
          activeEmbedConfig.value = config
          activeUrl.value = url
          activeResult.value = match
          nodeKey.value = key
          refreshOptions(config)
        }
        return
      }
    }

    const registerCommand = () => {
      unregisterCommand?.()
      unregisterCommand = undefined
      if (props.onOpenEmbedModalForConfig) {
        unregisterCommand = editor.registerCommand(
          INSERT_EMBED_COMMAND,
          (type) => {
            const config = props.embedConfigs.find((candidate) => candidate.type === type)
            if (config === undefined) return false
            props.onOpenEmbedModalForConfig?.(config)
            return true
          },
          COMMAND_PRIORITY_EDITOR,
        )
      }
    }

    onMounted(() => {
      const mutationListener = (
        mutations: Map<NodeKey, 'created' | 'updated' | 'destroyed'>,
        context: { dirtyLeaves: Set<NodeKey>; updateTags: Set<string> },
      ) => {
        for (const [key, mutation] of mutations) {
          if (
            mutation === 'created' &&
            context.updateTags.has(PASTE_TAG) &&
            context.dirtyLeaves.size <= 3
          ) {
            void checkIfLinkNodeIsEmbeddable(key)
          } else if (key === nodeKey.value) {
            reset()
          }
        }
      }
      unregisterMutations = mergeRegister(
        ...[LinkNode, AutoLinkNode].map((nodeClass) =>
          editor.registerMutationListener(nodeClass, mutationListener, {
            skipInitialization: true,
          }),
        ),
      )
      registerCommand()
    })

    onUnmounted(() => {
      unregisterMutations?.()
      unregisterCommand?.()
      reset()
    })

    const onSelectOption = (option: MenuOption, _targetNode: unknown, closeMenu: () => void) => {
      ;(option as AutoEmbedOption).onSelect(null)
      closeMenu()
    }

    return () =>
      nodeKey.value === null
        ? null
        : h(
            NodeMenuPlugin,
            {
              commandPriority: props.menuCommandPriority,
              nodeKey: nodeKey.value,
              onClose: reset,
              onSelectOption,
              options: options.value,
            },
            slots.default
              ? {
                  default: (slotProps: MenuSlotProps) =>
                    slots.default?.(slotProps as unknown as MenuSlotProps<AutoEmbedOption>),
                }
              : undefined,
          )
  },
})

export { AutoEmbedPlugin as LexicalAutoEmbedPlugin }
export default AutoEmbedPlugin
