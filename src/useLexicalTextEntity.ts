import { registerLexicalTextEntity, type EntityMatch } from '@lexical/text'
import { mergeRegister, type Klass, type TextNode } from 'lexical'
import type { MaybeRef, WatchStopHandle } from 'vue'
import { onMounted, onUnmounted, unref, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

export type TextEntityMatcher = (text: string) => EntityMatch | null
export type TextEntityNodeFactory<T extends TextNode> = (textNode: TextNode) => T

/**
 * Registers transforms that wrap matched text in a custom text entity node and
 * turn it back into plain text when it no longer matches.
 */
export function useLexicalTextEntity<T extends TextNode>(
  getMatch: MaybeRef<TextEntityMatcher>,
  targetNode: MaybeRef<Klass<T>>,
  createNode: MaybeRef<TextEntityNodeFactory<T>>,
): void {
  const editor = useLexicalComposer()
  let stopWatching: WatchStopHandle | undefined

  onMounted(() => {
    stopWatching = watch(
      () => [unref(getMatch), unref(targetNode), unref(createNode)] as const,
      ([currentGetMatch, currentTargetNode, currentCreateNode], _previous, onCleanup) => {
        onCleanup(
          mergeRegister(
            ...registerLexicalTextEntity(
              editor,
              currentGetMatch,
              currentTargetNode,
              currentCreateNode,
            ),
          ),
        )
      },
      { immediate: true },
    )
  })
  onUnmounted(() => stopWatching?.())
}

export { registerLexicalTextEntity, type EntityMatch } from '@lexical/text'
