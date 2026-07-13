import { $getNearestNodeFromDOMNode, $getRoot, type LexicalNode } from 'lexical'
import type { PropType, SlotsType, VNode, VNodeChild, VNodeRef } from 'vue'
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  Teleport,
  watch,
} from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { MenuOption } from './menu/LexicalMenu'

export interface NodeContextMenuOptionConfig {
  disabled?: boolean
  icon?: VNodeChild
  $onSelect: () => void
  $showOn?: (node: LexicalNode) => boolean
}

export class NodeContextMenuOption extends MenuOption {
  readonly type = 'item'
  declare title: string
  declare icon?: VNodeChild
  disabled: boolean
  $onSelect: () => void
  $showOn?: (node: LexicalNode) => boolean

  constructor(title: string, options: NodeContextMenuOptionConfig) {
    super(title)
    this.title = title
    this.disabled = options.disabled ?? false
    this.icon = options.icon
    this.$onSelect = options.$onSelect
    this.$showOn = options.$showOn
  }
}

export class NodeContextMenuSeparator extends MenuOption {
  readonly type = 'separator'
  $showOn?: (node: LexicalNode) => boolean

  constructor(options: { $showOn?: (node: LexicalNode) => boolean } = {}) {
    super('_separator')
    this.$showOn = options.$showOn
  }
}

export type NodeContextMenuItem = NodeContextMenuOption | NodeContextMenuSeparator

export interface NodeContextMenuSlotProps {
  activeIndex: number | null
  close: () => void
  items: readonly NodeContextMenuItem[]
  select: (option: NodeContextMenuOption) => void
  setActiveIndex: (index: number) => void
}

export interface NodeContextMenuPluginProps {
  className?: string
  itemClassName?: string
  items: readonly NodeContextMenuItem[]
  label?: string
  nested?: boolean
  parent?: HTMLElement
  separatorClassName?: string
}

function getSelectableIndices(items: readonly NodeContextMenuItem[]): number[] {
  return items.flatMap((item, index) => (item.type === 'item' && !item.disabled ? [index] : []))
}

export const NodeContextMenuPlugin = defineComponent({
  name: 'LexicalNodeContextMenuPlugin',
  inheritAttrs: false,
  props: {
    className: String,
    itemClassName: String,
    items: {
      type: Array as unknown as PropType<readonly NodeContextMenuItem[]>,
      required: true,
    },
    label: {
      type: String,
      default: 'Editor context menu',
    },
    nested: Boolean,
    parent: Object as PropType<HTMLElement>,
    separatorClassName: String,
  },
  slots: Object as SlotsType<{
    default?: (props: NodeContextMenuSlotProps) => VNode[]
  }>,
  setup(props, { attrs, slots }) {
    const editor = useLexicalComposer()
    const activeIndex = ref<number | null>(null)
    const isOpen = ref(false)
    const menuElement = ref<HTMLElement | null>(null)
    const position = ref({ x: 0, y: 0 })
    const visibleItems = shallowRef<readonly NodeContextMenuItem[]>([])
    let unregisterRoot: (() => void) | undefined
    let removeContextListener: (() => void) | undefined
    let typeahead = ''
    let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

    const setActiveIndex = (index: number) => {
      activeIndex.value = index
      visibleItems.value[index]?.ref.current?.focus()
    }

    const close = () => {
      if (!isOpen.value) return
      isOpen.value = false
      activeIndex.value = null
      typeahead = ''
      if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer)
      editor.focus()
    }

    const select = (option: NodeContextMenuOption) => {
      if (option.disabled) return
      editor.update(() => option.$onSelect())
      close()
    }

    const clampPosition = () => {
      const menu = menuElement.value
      if (menu === null) return
      const padding = 10
      const rect = menu.getBoundingClientRect()
      position.value = {
        x: Math.max(padding, Math.min(position.value.x, window.innerWidth - rect.width - padding)),
        y: Math.max(
          padding,
          Math.min(position.value.y, window.innerHeight - rect.height - padding),
        ),
      }
    }

    const open = (event: MouseEvent) => {
      event.preventDefault()
      const node = editor.read(
        () =>
          (event.target instanceof Node ? $getNearestNodeFromDOMNode(event.target) : null) ??
          $getRoot(),
      )
      visibleItems.value = props.items.filter((item) => !item.$showOn || item.$showOn(node))
      position.value = { x: event.clientX + 4, y: event.clientY + 5 }
      isOpen.value = true
      const selectable = getSelectableIndices(visibleItems.value)
      activeIndex.value = selectable[0] ?? null
      void nextTick(() => {
        clampPosition()
        if (activeIndex.value === null) menuElement.value?.focus()
        else visibleItems.value[activeIndex.value]?.ref.current?.focus()
      })
    }

    const move = (direction: 1 | -1) => {
      const selectable = getSelectableIndices(visibleItems.value)
      if (selectable.length === 0) return
      const current = activeIndex.value === null ? -1 : selectable.indexOf(activeIndex.value)
      const next =
        direction === 1
          ? selectable[(current + 1) % selectable.length]
          : selectable[(current <= 0 ? selectable.length : current) - 1]
      if (next !== undefined) setActiveIndex(next)
    }

    const matchTypeahead = (key: string) => {
      typeahead += key.toLocaleLowerCase()
      if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer)
      typeaheadTimer = setTimeout(() => {
        typeahead = ''
      }, 500)
      const index = visibleItems.value.findIndex(
        (item) =>
          item.type === 'item' &&
          !item.disabled &&
          item.title.toLocaleLowerCase().startsWith(typeahead),
      )
      if (index >= 0) setActiveIndex(index)
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') move(1)
      else if (event.key === 'ArrowUp') move(-1)
      else if (event.key === 'Home') {
        const first = getSelectableIndices(visibleItems.value)[0]
        if (first !== undefined) setActiveIndex(first)
      } else if (event.key === 'End') {
        const selectable = getSelectableIndices(visibleItems.value)
        const last = selectable.at(-1)
        if (last !== undefined) setActiveIndex(last)
      } else if (event.key === 'Enter' || event.key === ' ') {
        const item = activeIndex.value === null ? undefined : visibleItems.value[activeIndex.value]
        if (item?.type === 'item') select(item)
      } else if (event.key === 'Escape') close()
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        matchTypeahead(event.key)
      } else return
      event.preventDefault()
      event.stopPropagation()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!menuElement.value?.contains(event.target as Node)) close()
    }

    onMounted(() => {
      unregisterRoot = editor.registerRootListener((root) => {
        removeContextListener?.()
        removeContextListener = undefined
        if (root !== null) {
          root.addEventListener('contextmenu', open)
          removeContextListener = () => root.removeEventListener('contextmenu', open)
        }
      })
      document.addEventListener('pointerdown', onPointerDown)
      window.addEventListener('resize', close)
      document.addEventListener('scroll', close, true)
    })

    watch(
      () => props.items,
      () => {
        if (isOpen.value) close()
      },
    )

    onUnmounted(() => {
      unregisterRoot?.()
      removeContextListener?.()
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', close)
      document.removeEventListener('scroll', close, true)
      if (typeaheadTimer !== undefined) clearTimeout(typeaheadTimer)
    })

    return () => {
      if (!isOpen.value) return null
      const slotProps: NodeContextMenuSlotProps = {
        activeIndex: activeIndex.value,
        close,
        items: visibleItems.value,
        select,
        setActiveIndex,
      }
      const defaultContent = visibleItems.value.map((item, index): VNode => {
        if (item.type === 'separator') {
          return h('hr', {
            key: `${item.key}-${index}`,
            class: props.separatorClassName,
            role: 'separator',
          })
        }
        const option: NodeContextMenuOption = item
        return h(
          'button',
          {
            key: option.key,
            'aria-disabled': option.disabled || undefined,
            class: [props.itemClassName, { active: activeIndex.value === index }],
            disabled: option.disabled,
            onClick: () => select(option),
            onFocus: () => {
              activeIndex.value = index
            },
            onMouseenter: () => {
              if (!option.disabled) activeIndex.value = index
            },
            ref: option.setRefElement as VNodeRef,
            role: 'menuitem',
            tabindex: activeIndex.value === index ? 0 : -1,
            type: 'button',
          },
          [option.icon, option.title],
        )
      })
      const content: VNodeChild = slots.default?.(slotProps) ?? defaultContent
      const menu = h(
        'div',
        {
          ...attrs,
          'aria-label': props.label,
          class: [props.className, attrs.class],
          'data-nested': props.nested || undefined,
          onKeydown,
          ref: menuElement,
          role: 'menu',
          style: {
            ...(typeof attrs.style === 'object' ? attrs.style : {}),
            left: `${position.value.x}px`,
            position: 'fixed',
            top: `${position.value.y}px`,
            zIndex: 1000,
          },
          tabindex: -1,
        },
        [content],
      )
      return h(Teleport, { to: props.parent ?? document.body }, [menu])
    }
  },
})

export { NodeContextMenuPlugin as LexicalNodeContextMenuPlugin }
export default NodeContextMenuPlugin
