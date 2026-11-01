import type { EditorThemeClasses, LexicalEditor } from 'lexical'
import type { InjectionKey } from 'vue'
import { inject } from 'vue'

/** Framework context stored alongside an editor, matching the upstream theme contract. */
export interface LexicalComposerContextType {
  getTheme: () => EditorThemeClasses | null | undefined
}

/** Editor and framework context exposed by the nearest composer. */
export type LexicalComposerContextWithEditor = [LexicalEditor, LexicalComposerContextType]

/** Backwards-compatible Vue name for the provided composer tuple. */
export type LexicalComposerContext = LexicalComposerContextWithEditor

export const lexicalComposerContextKey: InjectionKey<LexicalComposerContext> =
  Symbol('LexicalComposerContext')

/** Vue injection-key equivalent of React's public composer context value. */
export const LexicalComposerContext = lexicalComposerContextKey

/** Creates a theme context with the same parent fallback semantics as @lexical/react. */
export function createLexicalComposerContext(
  parent: LexicalComposerContextWithEditor | null | undefined,
  theme: EditorThemeClasses | null | undefined,
): LexicalComposerContextType {
  const parentContext = parent?.[1]

  return {
    getTheme: () => theme ?? parentContext?.getTheme() ?? null,
  }
}

export function useLexicalComposerContext(): LexicalComposerContext {
  // The explicit default keeps Vue from warning about the missing
  // injection before the clearer error below is thrown.
  const context = inject(lexicalComposerContextKey, undefined)

  if (context === undefined) {
    throw new Error('useLexicalComposerContext() must be used inside a <LexicalComposer>.')
  }

  return context
}

export function useLexicalComposer(): LexicalEditor {
  return useLexicalComposerContext()[0]
}
