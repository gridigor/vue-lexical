import type {
  AnyLexicalExtension,
  LexicalExtensionDependency,
  LexicalExtensionOutput,
} from 'lexical'
import type { Component } from 'vue'
import { getExtensionDependencyFromEditor, getPeerDependencyFromEditor } from '@lexical/extension'
import { useLexicalComposer } from './LexicalComposerContext'

export function useExtensionDependency<Extension extends AnyLexicalExtension>(
  extension: Extension,
): LexicalExtensionDependency<Extension> {
  return getExtensionDependencyFromEditor(useLexicalComposer(), extension)
}

export function useOptionalExtensionDependency<Extension extends AnyLexicalExtension>(
  extension: Extension,
): LexicalExtensionDependency<Extension> | undefined {
  return usePeerExtensionDependency<typeof extension>(extension.name)
}

export function usePeerExtensionDependency<Extension extends AnyLexicalExtension>(
  extensionName: Extension['name'],
): LexicalExtensionDependency<Extension> | undefined {
  return getPeerDependencyFromEditor(useLexicalComposer(), extensionName)
}

type ExtensionOutputComponent<Extension extends AnyLexicalExtension> =
  LexicalExtensionOutput<Extension> extends { Component: infer OutputComponent extends Component }
    ? OutputComponent
    : never

export function useExtensionComponent<Extension extends AnyLexicalExtension>(
  extension: Extension &
    (ExtensionOutputComponent<Extension> extends never ? never : AnyLexicalExtension),
): ExtensionOutputComponent<Extension> {
  return useExtensionDependency(extension).output.Component as ExtensionOutputComponent<Extension>
}
