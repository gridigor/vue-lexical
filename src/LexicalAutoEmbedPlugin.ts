import { $isLinkNode, AutoLinkNode, LinkNode } from '@lexical/link'
import {
  $getNodeByKey,
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  mergeRegister,
  PASTE_TAG,
  type CommandListenerPriority,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical'
import type { PropType, SlotsType, VNode } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, shallowRef } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { NodeMenuPlugin } from './LexicalNodeMenuPlugin'
import { MenuOption, type MenuSlotProps } from './menu/LexicalMenu'

export interface EmbedMatchResult<TData = unknown> {
  data?: TData
  id: string
  url: string
}

export interface EmbedConfig<
  TData = unknown,
  TResult extends EmbedMatchResult<TData> = EmbedMatchResult<TData>,
> {
  insertNode: (editor: LexicalEditor, result: TResult) => void
  parseUrl: (text: string) => Promise<TResult | null> | TResult | null
  type: string
}

export const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/

export const INSERT_EMBED_COMMAND: LexicalCommand<EmbedConfig['type']> =
  createCommand('INSERT_EMBED_COMMAND')

export class AutoEmbedOption extends MenuOption {
  declare title: string
  onSelect: (targetNode: LexicalNode | null) => void

  constructor(title: string, options: { onSelect: (targetNode: LexicalNode | null) => void }) {
    super(title)
    this.title = title
    this.onSelect = options.onSelect.bind(this)
  }
}

export interface AutoEmbedPluginProps<TEmbedConfig extends EmbedConfig = EmbedConfig> {
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
    const nodeKey = shallowRef<NodeKey | null>(null)
    const activeEmbedConfig = shallowRef<EmbedConfig | null>(null)
    const activeUrl = shallowRef<string | null>(null)
    const options = shallowRef<readonly AutoEmbedOption[]>([])
    let unregisterMutations: (() => void) | undefined
    let unregisterCommand: (() => void) | undefined
    let checkSequence = 0

    const reset = () => {
      checkSequence += 1
      nodeKey.value = null
      activeEmbedConfig.value = null
      activeUrl.value = null
      options.value = []
    }

    const refreshOptions = (config: EmbedConfig) => {
      options.value = props.getMenuOptions(config, embedLink, reset)
    }

    const embedLink = async () => {
      const config = activeEmbedConfig.value
      const key = nodeKey.value
      const url = activeUrl.value
      if (config === null || key === null || url === null) return
      const result = await Promise.resolve(config.parseUrl(url))
      if (result === null) return
      editor.update(() => {
        const link = $getNodeByKey(key)
        if (!$isLinkNode(link)) return
        if ($getSelection() === null) link.selectEnd()
        config.insertNode(editor, result)
        if (link.isAttached()) link.remove()
      })
    }

    const checkIfLinkNodeIsEmbeddable = async (key: NodeKey) => {
      const sequence = ++checkSequence
      const url = editor.read(() => {
        const node = $getNodeByKey(key) as LinkNode
        return node.getURL()
      })
      const matches = await Promise.all(
        props.embedConfigs.map(async (config) => ({
          config,
          match: await Promise.resolve(config.parseUrl(url)),
        })),
      )
      if (sequence !== checkSequence) return
      const active = matches.find(({ match }) => match !== null)
      if (active !== undefined) {
        activeEmbedConfig.value = active.config
        activeUrl.value = url
        nodeKey.value = key
        refreshOptions(active.config)
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
