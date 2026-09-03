import type { Doc } from 'yjs'
import type { InjectionKey } from 'vue'
import { inject, shallowReactive } from 'vue'

/** The collaboration state shared by the editors under a provider. */
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

/** Vue injection key holding the shared collaboration context. */
export const collaborationContextKey: InjectionKey<CollaborationContext> = Symbol(
  'LexicalCollaborationContext',
)

/** Creates a collaboration context with a random name and cursor color. */
export function createCollaborationContext(name?: string, color?: string): CollaborationContext {
  const randomEntry = entries[Math.floor(Math.random() * entries.length)]

  return shallowReactive({
    color: color ?? randomEntry[1],
    isCollabActive: false,
    name: name ?? randomEntry[0],
    yjsDocMap: shallowReactive(new Map()),
  })
}

/** Reads the collaboration context from the nearest provider. */
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
