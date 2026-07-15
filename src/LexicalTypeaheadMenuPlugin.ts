import { getScrollParent as getScrollParentFromUtils } from '@lexical/utils'
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  mergeRegister,
  type CommandListenerPriority,
  type LexicalCommand,
  type TextNode,
} from 'lexical'
import type { PropType, SlotsType, VNode, VNodeChild, VNodeRef, WatchStopHandle } from 'vue'
import { defineComponent, h, nextTick, onMounted, onUnmounted, ref, Teleport, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  $splitNodeContainingQuery,
  getQueryTextForSearch,
  isTriggerVisible,
  isSelectionOnEntityBoundary,
  MenuOption,
  type MenuResolution,
  type MenuSlotProps,
  type MenuTextMatch,
  positionMenuAnchor,
  scrollIntoViewIfNeeded,
  setMenuAnchorAttributes,
  tryToPositionRange,
  type TriggerFn,
  useDynamicPositioning,
} from './menu/LexicalMenu'

export const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;'

export interface BasicTypeaheadTriggerOptions {
  allowWhitespace?: boolean
  maxLength?: number
  minLength?: number
  punctuation?: string
}

export interface TypeaheadMenuPluginProps<TOption extends MenuOption = MenuOption> {
  anchorClassName?: string
  commandPriority?: CommandListenerPriority
  ignoreEntityBoundary?: boolean
  onClose?: () => void | PromiseLike<void>
  onOpen?: (resolution: MenuResolution) => void
  onQueryChange: (matchingString: string | null) => void
  onSelectOption: (
    option: TOption,
    textNodeContainingQuery: TextNode | null,
    closeMenu: () => void,
    matchingString: string,
  ) => void
  options: readonly TOption[]
  parent?: HTMLElement
  preselectFirstItem?: boolean
  triggerFn: TriggerFn
}

export const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
  index: number
  option: MenuOption
}> = createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND')

export function createBasicTypeaheadTriggerMatch(
  trigger: string,
  {
    allowWhitespace = false,
    maxLength = 75,
    minLength = 1,
    punctuation = PUNCTUATION,
  }: BasicTypeaheadTriggerOptions = {},
): TriggerFn {
  const validCharacters = `[^${trigger}${punctuation}${allowWhitespace ? '' : '\\s'}]`
  const expression = new RegExp(
    `(^|\\s|\\()([${trigger}]((?:${validCharacters}){0,${maxLength}}))$`,
  )

  return (text) => {
    const match = expression.exec(text)
    if (match === null) {
      return null
    }
    const leadingText = match[1] ?? ''
    const matchingString = match[3] ?? ''
    if (matchingString.length < minLength) {
      return null
    }
    return {
      leadOffset: match.index + leadingText.length,
      matchingString,
      replaceableString: match[2] ?? '',
    }
  }
}

/** Vue-compatible alias matching the upstream composable name. */
export const useBasicTypeaheadTriggerMatch = createBasicTypeaheadTriggerMatch

/** @deprecated Import getScrollParent from @lexical/utils instead. */
export const getScrollParent = getScrollParentFromUtils
export { useDynamicPositioning }

export const TypeaheadMenuPlugin = defineComponent({
  name: 'LexicalTypeaheadMenuPlugin',
  props: {
    anchorClassName: String,
    commandPriority: {
      type: Number as PropType<CommandListenerPriority>,
      default: COMMAND_PRIORITY_LOW,
    },
    ignoreEntityBoundary: Boolean,
    onClose: Function as PropType<() => void | PromiseLike<void>>,
    onOpen: Function as PropType<(resolution: MenuResolution) => void>,
    onQueryChange: {
      type: Function as PropType<(matchingString: string | null) => void>,
      required: true,
    },
    onSelectOption: {
      type: Function as PropType<TypeaheadMenuPluginProps['onSelectOption']>,
      required: true,
    },
    options: {
      type: Array as unknown as PropType<readonly MenuOption[]>,
      required: true,
    },
    parent: Object as PropType<HTMLElement>,
    preselectFirstItem: {
      type: Boolean,
      default: true,
    },
    triggerFn: {
      type: Function as PropType<TriggerFn>,
      required: true,
    },
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
    let unregisterEditable: (() => void) | undefined
    let closeSequence = 0

    const updateSelectedIndex = (index: number) => {
      const root = editor.getRootElement()
      selectedIndex.value = index
      root?.setAttribute('aria-activedescendant', `typeahead-item-${index}`)
    }

    const finishClose = (sequence: number) => {
      if (sequence === closeSequence) {
        resolution.value = null
      }
    }

    const closeMenu = () => {
      if (resolution.value === null) {
        return
      }
      const sequence = ++closeSequence
      let result: void | PromiseLike<void> = undefined
      try {
        result = props.onClose?.()
      } finally {
        if (result !== undefined) {
          result.then(
            () => finishClose(sequence),
            () => finishClose(sequence),
          )
        } else {
          finishClose(sequence)
        }
      }
    }

    const openMenu = (nextResolution: MenuResolution) => {
      const wasClosed = resolution.value === null
      closeSequence += 1
      resolution.value = nextResolution
      if (wasClosed) {
        props.onOpen?.(nextResolution)
      }
    }

    const selectOptionAndCleanUp = (option: MenuOption) => {
      const currentResolution = resolution.value
      if (currentResolution === null) {
        return
      }
      editor.update(() => {
        const queryNode = currentResolution.match
          ? $splitNodeContainingQuery(currentResolution.match)
          : null
        props.onSelectOption(
          option,
          queryNode,
          closeMenu,
          currentResolution.match?.matchingString ?? '',
        )
      })
    }

    const reposition = () => {
      if (anchorElement.value !== null && resolution.value !== null) {
        positionMenuAnchor(anchorElement.value, resolution.value, editor)
      }
    }

    const registerMenuCommands = () =>
      mergeRegister(
        editor.registerCommand(
          SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND,
          ({ option }) =>
            option.ref.current === null ? false : scrollIntoViewIfNeeded(option.ref.current),
          props.commandPriority,
        ),
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
            if (option?.ref.current) {
              editor.dispatchCommand(SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND, { index, option })
            }
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

          anchor.id = 'typeahead-menu'
          root?.setAttribute('aria-controls', anchor.id)
          if (props.preselectFirstItem && props.options.length > 0) {
            updateSelectedIndex(0)
          }
          const unregisterCommands = registerMenuCommands()
          let animationFrame = 0
          let visible = true
          const scrollParent = root ? getScrollParentFromUtils(root, false) : parent
          const onPositionChange = () => {
            if (animationFrame === 0) {
              animationFrame = requestAnimationFrame(() => {
                animationFrame = 0
                reposition()
              })
            }
            const nextVisible = isTriggerVisible(anchor, scrollParent)
            if (visible && !nextVisible) closeMenu()
            visible = nextVisible
          }
          const resizeObserver = new ResizeObserver(reposition)
          resizeObserver.observe(anchor)
          window.addEventListener('resize', reposition)
          document.addEventListener('scroll', onPositionChange, { capture: true, passive: true })
          void nextTick(reposition)

          onCleanup(() => {
            unregisterCommands()
            resizeObserver.disconnect()
            window.removeEventListener('resize', reposition)
            document.removeEventListener('scroll', onPositionChange, true)
            if (animationFrame !== 0) cancelAnimationFrame(animationFrame)
          })
        },
        { immediate: true },
      )

      unregisterUpdate = editor.registerUpdateListener(() => {
        if (editor.isComposing()) return

        const selection = editor.getEditorState().read(() => $getSelection())
        const text = getQueryTextForSearch(editor)
        if (!$isRangeSelection(selection) || !selection.isCollapsed() || text === null) {
          props.onQueryChange(null)
          closeMenu()
          return
        }

        const match = props.triggerFn(text, editor)
        props.onQueryChange(match?.matchingString ?? null)
        if (
          match === null ||
          (!props.ignoreEntityBoundary && isSelectionOnEntityBoundary(editor, match.leadOffset))
        ) {
          closeMenu()
          return
        }

        const editorWindow = editor.getRootElement()?.ownerDocument.defaultView ?? window
        const range = editorWindow.document.createRange()
        if (tryToPositionRange(match.leadOffset, range, editorWindow, editor.getRootElement())) {
          openMenu({ getRect: () => range.getBoundingClientRect(), match })
        } else {
          closeMenu()
        }
      })
      unregisterEditable = editor.registerEditableListener((editable) => {
        if (!editable) {
          closeMenu()
        }
      })
    })

    onUnmounted(() => {
      unregisterUpdate?.()
      unregisterEditable?.()
      stopResolutionWatch?.()
      const root = editor.getRootElement()
      root?.removeAttribute('aria-controls')
      root?.removeAttribute('aria-activedescendant')
      anchorElement.value?.remove()
    })

    watch(
      () => [props.options, props.preselectFirstItem] as const,
      () => {
        if (resolution.value === null) return
        if (props.options.length === 0) {
          selectedIndex.value = null
          editor.getRootElement()?.removeAttribute('aria-activedescendant')
        } else if (selectedIndex.value === null && props.preselectFirstItem) {
          updateSelectedIndex(0)
        } else if (selectedIndex.value !== null && selectedIndex.value >= props.options.length) {
          updateSelectedIndex(props.options.length - 1)
        }
      },
    )

    return () => {
      const anchor = anchorElement.value
      const currentResolution = resolution.value
      if (anchor === null || currentResolution === null || props.options.length === 0) return null

      const slotProps: MenuSlotProps = {
        anchorElement: anchor,
        matchingString: currentResolution.match?.matchingString ?? '',
        options: props.options,
        selectedIndex: selectedIndex.value,
        selectOptionAndCleanUp,
        setHighlightedIndex: updateSelectedIndex,
      }
      const content: VNodeChild =
        slots.default?.(slotProps) ??
        h('div', { class: 'typeahead-popover' }, [
          h(
            'ul',
            { role: 'presentation' },
            props.options.map((option, index) =>
              h(
                'li',
                {
                  id: `typeahead-item-${index}`,
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
export type { MenuResolution, MenuSlotProps, MenuTextMatch, TriggerFn }
export { TypeaheadMenuPlugin as LexicalTypeaheadMenuPlugin }
export default TypeaheadMenuPlugin
