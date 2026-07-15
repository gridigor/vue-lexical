import type { FocusManagerOptions } from '@lexical/a11y'
import type { MaybeRefOrGetter } from 'vue'
import { FocusManagerExtension } from '@lexical/a11y'
import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  resolveRefOption,
  useLexicalExtensionElementRef,
  type LexicalElementRef,
} from './useLexicalExtensionElementRef'

export type { FocusManagerOptions } from '@lexical/a11y'

export function useLexicalFocusManagerRef(
  options: MaybeRefOrGetter<FocusManagerOptions> = {},
): LexicalElementRef {
  const editor = useLexicalComposer()

  return useLexicalExtensionElementRef((element) =>
    getExtensionDependencyFromEditor(editor, FocusManagerExtension).output.register(
      element,
      resolveRefOption(options),
    ),
  )
}
