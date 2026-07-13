import {
  $getNodeByKey,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type CommandListenerPriority,
  type NodeKey,
  type TextNode,
} from 'lexical'
import type { PropType, SlotsType, VNode, VNodeChild, VNodeRef, WatchStopHandle } from 'vue'
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref, Teleport, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  MenuOption,
  type MenuResolution,
  type MenuSlotProps,
  positionMenuAnchor,
  scrollIntoViewIfNeeded,
  setMenuAnchorAttributes,
} from './menu/LexicalMenu'

export interface NodeMenuPluginProps<TOption extends MenuOption = MenuOption> {
  anchorClassName?: string
  commandPriority?: CommandListenerPriority
  nodeKey: NodeKey | null
  onClose?: () => void | PromiseLike<void>
  onOpen?: (resolution: MenuResolution) => void
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void
  options: readonly TOption[]
  parent?: HTMLElement
}

export const NodeMenuPlugin = defineComponent({
  name: 'LexicalNodeMenuPlugin',
  props: {
    anchorClassName: String,
    commandPriority: {
      type: Number as PropType<CommandListenerPriority>,
      default: COMMAND_PRIORITY_LOW,
    },
    nodeKey: {
      type: String as PropType<NodeKey | null>,
      default: null,
    },
    onClose: Function as PropType<() => void | PromiseLike<void>>,
    onOpen: Function as PropType<(resolution: MenuResolution) => void>,
    onSelectOption: {
      type: Function as PropType<NodeMenuPluginProps['onSelectOption']>,
      required: true,
    },
    options: {
      type: Array as unknown as PropType<readonly MenuOption[]>,
      required: true,
    },
    parent: Object as PropType<HTMLElement>,
  },
  slots: Object as SlotsType<{
    default?: (props: MenuSlotProps) => VNode[]
  }>,
  setup(props, { slots }) {
    const editor = useLexicalComposer()
    const anchorElement = ref<HTMLElement | null>(null)
    const resolution = ref<MenuResolution | null>(null)
    const selectedIndex = ref<number | null>(null)
    let stopResolutionWatch: WatchStopHandle | undefined
    let unregisterUpdate: (() => void) | undefined
    let closeSequence = 0

    const updateSelectedIndex = (index: number) => {
      selectedIndex.value = index
      editor.getRootElement()?.setAttribute('aria-activedescendant', `node-menu-item-${index}`)
    }

    const finishClose = (sequence: number) => {
      if (sequence === closeSequence) resolution.value = null
    }

    const closeMenu = () => {
      if (resolution.value === null) return
      const sequence = ++closeSequence
      let result: void | PromiseLike<void> = undefined
      try {
        result = props.onClose?.()
      } finally {
        if (result === undefined) finishClose(sequence)
        else
          result.then(
            () => finishClose(sequence),
            () => finishClose(sequence),
          )
      }
    }

    const openMenu = (nextResolution: MenuResolution) => {
      const wasClosed = resolution.value === null
      closeSequence += 1
      resolution.value = nextResolution
      if (wasClosed) props.onOpen?.(nextResolution)
    }

    const positionOrCloseMenu = () => {
      const nodeKey = props.nodeKey
      if (nodeKey === null) {
        closeMenu()
        return
      }
      editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey)
        const element = editor.getElementByKey(nodeKey)
        if (node === null || element === null) {
          closeMenu()
        } else if (resolution.value === null) {
          openMenu({ getRect: () => element.getBoundingClientRect() })
        }
      })
    }

    const selectOptionAndCleanUp = (option: MenuOption) => {
      if (resolution.value === null) return
      editor.update(() => props.onSelectOption(option, null, closeMenu, ''))
    }

    const reposition = () => {
      if (anchorElement.value !== null && resolution.value !== null) {
        positionMenuAnchor(anchorElement.value, resolution.value, editor)
      }
    }

    const registerMenuCommands = () =>
      mergeRegister(
        editor.registerCommand(
          KEY_ARROW_DOWN_COMMAND,
          (event) => {
            if (props.options.length === 0) return false
            const index =
              selectedIndex.value === null || selectedIndex.value === props.options.length - 1
                ? 0
                : selectedIndex.value + 1
            updateSelectedIndex(index)
            const option = props.options[index]
            if (option?.ref.current) scrollIntoViewIfNeeded(option.ref.current)
            event?.preventDefault()
            event?.stopImmediatePropagation()
            return true
          },
          props.commandPriority,
        ),
        editor.registerCommand(
          KEY_ARROW_UP_COMMAND,
          (event) => {
            if (props.options.length === 0) return false
            const index =
              selectedIndex.value === null || selectedIndex.value === 0
                ? props.options.length - 1
                : selectedIndex.value - 1
            updateSelectedIndex(index)
            const option = props.options[index]
            if (option?.ref.current) scrollIntoViewIfNeeded(option.ref.current)
            event?.preventDefault()
            event?.stopImmediatePropagation()
            return true
          },
          props.commandPriority,
        ),
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          (event) => {
            event?.preventDefault()
            event?.stopImmediatePropagation()
            closeMenu()
            return true
          },
          props.commandPriority,
        ),
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) => {
            const option =
              selectedIndex.value === null ? undefined : props.options[selectedIndex.value]
            if (option === undefined) return false
            event?.preventDefault()
            event?.stopImmediatePropagation()
            selectOptionAndCleanUp(option)
            return true
          },
          props.commandPriority,
        ),
        editor.registerCommand(
          KEY_ENTER_COMMAND,
          (event) => {
            const option =
              selectedIndex.value === null ? undefined : props.options[selectedIndex.value]
            if (option === undefined || event?.shiftKey) return false
            event?.preventDefault()
            event?.stopImmediatePropagation()
            selectOptionAndCleanUp(option)
            return true
          },
          props.commandPriority,
        ),
      )

    onMounted(() => {
      const root = editor.getRootElement()
      const parent = props.parent ?? root?.ownerDocument.body ?? document.body
      const anchor = parent.ownerDocument.createElement('div')
      setMenuAnchorAttributes(anchor, props.anchorClassName)
      anchor.setAttribute('aria-label', 'Node menu')
      parent.append(anchor)
      anchorElement.value = anchor

      stopResolutionWatch = watch(
        resolution,
        (current, _previous, onCleanup) => {
          if (current === null) {
            root?.removeAttribute('aria-controls')
            root?.removeAttribute('aria-activedescendant')
            selectedIndex.value = null
            anchor.removeAttribute('id')
            return
          }
          anchor.id = 'node-menu'
          root?.setAttribute('aria-controls', anchor.id)
          if (props.options.length > 0) updateSelectedIndex(0)
          const unregisterCommands = registerMenuCommands()
          const resizeObserver = new ResizeObserver(reposition)
          resizeObserver.observe(anchor)
          window.addEventListener('resize', reposition)
          document.addEventListener('scroll', reposition, { capture: true, passive: true })
          void nextTick(reposition)
          onCleanup(() => {
            unregisterCommands()
            resizeObserver.disconnect()
            window.removeEventListener('resize', reposition)
            document.removeEventListener('scroll', reposition, true)
          })
        },
        { immediate: true },
      )

      unregisterUpdate = editor.registerUpdateListener(({ dirtyElements }) => {
        if (props.nodeKey !== null && dirtyElements.has(props.nodeKey)) positionOrCloseMenu()
      })
      positionOrCloseMenu()
    })

    watch(
      () => props.nodeKey,
      () => positionOrCloseMenu(),
    )

    watch(
      () => props.options,
      () => {
        if (resolution.value === null) return
        if (props.options.length === 0) {
          selectedIndex.value = null
          editor.getRootElement()?.removeAttribute('aria-activedescendant')
        } else if (selectedIndex.value === null) {
          updateSelectedIndex(0)
        } else if (selectedIndex.value >= props.options.length) {
          updateSelectedIndex(props.options.length - 1)
        }
      },
    )

    onUnmounted(() => {
      unregisterUpdate?.()
      stopResolutionWatch?.()
      const root = editor.getRootElement()
      root?.removeAttribute('aria-controls')
      root?.removeAttribute('aria-activedescendant')
      anchorElement.value?.remove()
    })

    return () => {
      const anchor = anchorElement.value
      if (anchor === null || resolution.value === null || props.options.length === 0) return null
      const slotProps: MenuSlotProps = {
        anchorElement: anchor,
        matchingString: '',
        options: props.options,
        selectedIndex: selectedIndex.value,
        selectOptionAndCleanUp,
        setHighlightedIndex: updateSelectedIndex,
      }
      const content: VNodeChild =
        slots.default?.(slotProps) ??
        h('div', { class: 'node-menu-popover' }, [
          h(
            'ul',
            { role: 'presentation' },
            props.options.map((option, index) =>
              h(
                'li',
                {
                  id: `node-menu-item-${index}`,
                  key: option.key,
                  'aria-selected': selectedIndex.value === index,
                  class: ['item', { selected: selectedIndex.value === index }],
                  onClick: () => selectOptionAndCleanUp(option),
                  onMouseenter: () => updateSelectedIndex(index),
                  ref: option.setRefElement as VNodeRef,
                  role: 'option',
                  tabindex: -1,
                },
                [option.icon, h('span', { class: 'text' }, [option.title])],
              ),
            ),
          ),
        ])
      return h(Teleport, { to: anchor }, [content])
    }
  },
})

export { MenuOption }
export type { MenuResolution, MenuSlotProps }
export { NodeMenuPlugin as LexicalNodeMenuPlugin }
export default NodeMenuPlugin
