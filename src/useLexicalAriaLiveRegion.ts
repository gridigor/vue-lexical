import { AriaLiveRegionExtension } from '@lexical/a11y'
import { getExtensionDependencyFromEditor } from '@lexical/extension'
import { useLexicalComposer } from './LexicalComposerContext'

export function useLexicalAriaLiveRegion(): (message: string) => void {
  const editor = useLexicalComposer()

  return (message) => {
    getExtensionDependencyFromEditor(editor, AriaLiveRegionExtension).output.announce(message)
  }
}
