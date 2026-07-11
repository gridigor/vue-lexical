import type { InjectionKey } from 'vue'
import type { LexicalEditor } from 'lexical'
import { inject } from 'vue'

export type LexicalComposerContext = readonly [LexicalEditor]

export const lexicalComposerContextKey: InjectionKey<LexicalComposerContext> =
  Symbol('LexicalComposerContext')

export function useLexicalComposerContext(): LexicalComposerContext {
  const context = inject(lexicalComposerContextKey)

  if (context === undefined) {
    throw new Error('useLexicalComposerContext() must be used inside a <LexicalComposer>.')
  }

  return context
}

export function useLexicalComposer(): LexicalEditor {
  return useLexicalComposerContext()[0]
}
