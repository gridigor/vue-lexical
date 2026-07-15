import type { RovingTabIndexOptions } from '@lexical/a11y'
import type { MaybeRefOrGetter } from 'vue'
import { RovingTabIndexExtension } from '@lexical/a11y'
import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  resolveRefOption,
  useLexicalExtensionElementRef,
  type LexicalElementRef,
} from './useLexicalExtensionElementRef'

export type { RovingOrientation, RovingTabIndexOptions } from '@lexical/a11y'

export function useLexicalRovingTabIndexRef(
  options: MaybeRefOrGetter<RovingTabIndexOptions> = {},
): LexicalElementRef {
  const editor = useLexicalComposer()

  return useLexicalExtensionElementRef((element) =>
    getExtensionDependencyFromEditor(editor, RovingTabIndexExtension).output.register(
      element,
      resolveRefOption(options),
    ),
  )
}
