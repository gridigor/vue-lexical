import type { FocusTrapInitialFocus } from '@lexical/a11y'
import type { MaybeRef, MaybeRefOrGetter } from 'vue'
import { FocusTrapExtension } from '@lexical/a11y'
import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { isRef } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import {
  resolveRefOption,
  useLexicalExtensionElementRef,
  type LexicalElementRef,
} from './useLexicalExtensionElementRef'

export type { FocusTrapInitialFocus } from '@lexical/a11y'

export function useLexicalFocusTrapRef(
  isActive: MaybeRefOrGetter<boolean>,
  initialFocus: MaybeRefOrGetter<FocusTrapInitialFocus> = 'firstFocusable',
  allowOutside?: MaybeRef<(target: HTMLElement) => boolean>,
): LexicalElementRef {
  const editor = useLexicalComposer()

  return useLexicalExtensionElementRef((element) => {
    if (!resolveRefOption(isActive)) {
      return () => {}
    }

    const allowOutsideValue = isRef(allowOutside) ? allowOutside.value : allowOutside
    return getExtensionDependencyFromEditor(editor, FocusTrapExtension).output.register(element, {
      allowOutside: (target) => allowOutsideValue?.(target) ?? false,
      initialFocus: resolveRefOption(initialFocus),
    })
  })
}
