import type { Doc } from 'yjs'
import type { InjectionKey, PropType } from 'vue'
import { defineComponent, inject, provide } from 'vue'

export interface CollaborationContext {
  color: string
  isCollabActive: boolean
  name: string
  yjsDocMap: Map<string, Doc>
}

export type CollaborationContextType = CollaborationContext

const entries = [
  ['Cat', 'rgb(125, 50, 0)'],
  ['Dog', 'rgb(100, 0, 0)'],
  ['Rabbit', 'rgb(150, 0, 0)'],
  ['Frog', 'rgb(200, 0, 0)'],
  ['Fox', 'rgb(200, 75, 0)'],
  ['Hedgehog', 'rgb(0, 75, 0)'],
  ['Pigeon', 'rgb(0, 125, 0)'],
  ['Squirrel', 'rgb(75, 100, 0)'],
  ['Bear', 'rgb(125, 100, 0)'],
  ['Tiger', 'rgb(0, 0, 150)'],
  ['Leopard', 'rgb(0, 0, 200)'],
  ['Zebra', 'rgb(0, 0, 250)'],
  ['Wolf', 'rgb(0, 100, 150)'],
  ['Owl', 'rgb(0, 100, 100)'],
  ['Gull', 'rgb(100, 0, 100)'],
  ['Squid', 'rgb(150, 0, 150)'],
] as const

export const collaborationContextKey: InjectionKey<CollaborationContext> = Symbol(
  'LexicalCollaborationContext',
)

export function createCollaborationContext(name?: string, color?: string): CollaborationContext {
  const randomEntry = entries[Math.floor(Math.random() * entries.length)]

  return {
    color: color ?? randomEntry[1],
    isCollabActive: false,
    name: name ?? randomEntry[0],
    yjsDocMap: new Map(),
  }
}

export const LexicalCollaboration = defineComponent({
  name: 'LexicalCollaboration',
  props: {
    context: {
      type: Object as PropType<CollaborationContext>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provide(collaborationContextKey, props.context ?? createCollaborationContext())

    return () => slots.default?.()
  },
})

export function useCollaborationContext(username?: string, color?: string): CollaborationContext {
  const context = inject(collaborationContextKey)

  if (context === undefined) {
    throw new Error('useCollaborationContext() must be used inside a <LexicalCollaboration>.')
  }

  if (username !== undefined) {
    context.name = username
  }
  if (color !== undefined) {
    context.color = color
  }

  return context
}

export default LexicalCollaboration
