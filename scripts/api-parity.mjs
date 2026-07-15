export const API_PARITY = [
  ['ExtensionComponent', 'ExtensionComponent'],
  ['LexicalAutoEmbedPlugin', 'LexicalAutoEmbedPlugin'],
  ['LexicalAutoFocusPlugin', 'LexicalAutoFocusPlugin'],
  ['LexicalAutoLinkPlugin', 'LexicalAutoLinkPlugin'],
  ['LexicalBlockWithAlignableContents', 'LexicalBlockWithAlignableContents'],
  ['LexicalCharacterLimitPlugin', 'LexicalCharacterLimitPlugin'],
  ['LexicalCheckListPlugin', 'LexicalCheckListPlugin'],
  ['LexicalClearEditorPlugin', 'LexicalClearEditorPlugin'],
  ['LexicalClickableLinkPlugin', 'LexicalClickableLinkPlugin'],
  ['LexicalCollaborationContext', 'LexicalCollaborationContext'],
  ['LexicalCollaborationPlugin', 'LexicalCollaborationPlugin'],
  ['LexicalComposer', 'LexicalComposer'],
  ['LexicalComposerContext', 'LexicalComposerContext'],
  ['LexicalContentEditable', 'LexicalContentEditable'],
  ['LexicalDecoratorBlockNode', 'LexicalDecoratorBlockNode'],
  ['LexicalDraggableBlockPlugin', 'LexicalDraggableBlockPlugin'],
  ['LexicalEditorRefPlugin', 'LexicalEditorRefPlugin'],
  ['LexicalErrorBoundary', 'LexicalErrorBoundary'],
  ['LexicalExtensionComposer', 'LexicalExtensionComposer'],
  ['LexicalExtensionEditorComposer', 'LexicalExtensionEditorComposer'],
  ['LexicalHashtagPlugin', 'LexicalHashtagPlugin'],
  ['LexicalHistoryPlugin', 'LexicalHistoryPlugin'],
  ['LexicalHorizontalRuleNode', 'LexicalHorizontalRuleNode'],
  ['LexicalHorizontalRulePlugin', 'LexicalHorizontalRulePlugin'],
  ['LexicalLinkPlugin', 'LexicalLinkPlugin'],
  ['LexicalListPlugin', 'LexicalListPlugin'],
  ['LexicalMarkdownShortcutPlugin', 'LexicalMarkdownShortcutPlugin'],
  ['LexicalNestedComposer', 'LexicalNestedComposer'],
  ['LexicalNodeContextMenuPlugin', 'LexicalNodeContextMenuPlugin'],
  ['LexicalNodeEventPlugin', 'LexicalNodeEventPlugin'],
  ['LexicalNodeMenuPlugin', 'LexicalNodeMenuPlugin'],
  ['LexicalOnChangePlugin', 'LexicalOnChangePlugin'],
  ['LexicalPlainTextPlugin', 'LexicalPlainTextPlugin'],
  ['LexicalRichTextPlugin', 'LexicalRichTextPlugin'],
  ['LexicalSelectionAlwaysOnDisplay', 'LexicalSelectionAlwaysOnDisplay'],
  ['LexicalTabIndentationPlugin', 'LexicalTabIndentationPlugin'],
  ['LexicalTableOfContentsPlugin', 'LexicalTableOfContentsPlugin'],
  ['LexicalTablePlugin', 'LexicalTablePlugin'],
  ['LexicalTreeView', 'LexicalTreeView'],
  ['LexicalTypeaheadMenuPlugin', 'LexicalTypeaheadMenuPlugin'],
  ['ReactExtension', 'VueExtension'],
  ['ReactPluginHostExtension', 'VuePluginHostExtension'],
  ['ReactProviderExtension', 'VueProviderExtension'],
  ['TreeViewExtension', 'TreeViewExtension'],
  ['useExtensionComponent', 'useExtensionComponent'],
  ['useExtensionSignalValue', 'useExtensionSignalValue'],
  ['useLexicalAriaLiveRegion', 'useLexicalAriaLiveRegion'],
  ['useLexicalEditable', 'useLexicalEditable'],
  ['useLexicalFocusManagerRef', 'useLexicalFocusManagerRef'],
  ['useLexicalFocusTrapRef', 'useLexicalFocusTrapRef'],
  ['useLexicalIsTextContentEmpty', 'useLexicalIsTextContentEmpty'],
  ['useLexicalNodeSelection', 'useLexicalNodeSelection'],
  ['useLexicalRovingTabIndexRef', 'useLexicalRovingTabIndexRef'],
  ['useLexicalSlotRef', 'useLexicalSlotRef'],
  ['useLexicalSubscription', 'useLexicalSubscription'],
  ['useLexicalTextEntity', 'useLexicalTextEntity'],
]

/**
 * Public symbols whose Vue equivalent intentionally uses framework-specific
 * naming or a scoped-slot contract. Unlisted symbols must keep their upstream
 * name in the mapped Vue entrypoint.
 */
export const API_SYMBOL_MAPPINGS = {
  'LexicalNodeMenuPlugin:MenuRenderFn': 'MenuSlotProps',
  'LexicalTypeaheadMenuPlugin:MenuRenderFn': 'MenuSlotProps',
  'ReactExtension:ReactConfig': 'VueConfig',
  'ReactExtension:ReactExtension': 'VueExtension',
  'ReactExtension:ReactOutputs': 'VueOutputs',
  'ReactPluginHostExtension:DecoratorComponentProps': 'VuePluginHostDecoratorProps',
  'ReactPluginHostExtension:HostMountCommandArg': 'VuePluginHostMountCommandArg',
  'ReactPluginHostExtension:MountPluginCommandArg': 'MountVuePluginCommandArg',
  'ReactPluginHostExtension:REACT_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND':
    'VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND',
  'ReactPluginHostExtension:REACT_PLUGIN_HOST_MOUNT_ROOT_COMMAND':
    'VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND',
  'ReactPluginHostExtension:ReactPluginHostExtension': 'VuePluginHostExtension',
  'ReactPluginHostExtension:mountReactExtensionComponent': 'mountVueExtensionComponent',
  'ReactPluginHostExtension:mountReactPluginComponent': 'mountVuePluginComponent',
  'ReactPluginHostExtension:mountReactPluginElement': 'mountVuePluginElement',
  'ReactPluginHostExtension:mountReactPluginHost': 'mountVuePluginHost',
  'ReactProviderExtension:ReactProviderExtension': 'VueProviderExtension',
}

export function collectPublicExports(sourceText) {
  const names = []
  const declarations =
    /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type|enum)\s+([$A-Z_a-z][$\w]*)/g
  const exportLists = /export\s+(?:type\s+)?\{([\s\S]*?)\}(?:\s+from\s+['"][^'"]+['"])?/g

  for (const match of sourceText.matchAll(declarations)) {
    names.push(match[1])
  }
  for (const match of sourceText.matchAll(exportLists)) {
    for (const entry of match[1].split(',')) {
      const parts = entry
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
      const name = parts.at(-1)?.trim()
      if (name) {
        names.push(name)
      }
    }
  }

  return [...new Set(names)].sort()
}
