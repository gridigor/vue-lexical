# @lexical/react API parity matrix

This matrix covers every canonical public entrypoint published by
`@lexical/react@0.47.0`. Each entrypoint has a supported Vue equivalent;
component props, React hooks, JSX render callbacks, and portals are adapted to
Vue props, composables, slots, and Teleport.

The audit is executable: `npm run check:api-parity` compares this matrix with
the installed upstream package, verifies every Vue source module, public symbol,
and root export, and fails when an upstream entrypoint or symbol is added or
removed. Run
`npm run generate:api-parity` after intentionally updating the matrix.

- 56 of 56 upstream entrypoints mapped
- 53 entrypoints keep the same subpath
- 3 framework-named entrypoints use a `Vue*` name
- Detailed contract differences: [Vue API differences](./VUE_API_DIFFERENCES.md)

| @lexical/react 0.47.0                              | Vue equivalent                                            | Mapping      |
| -------------------------------------------------- | --------------------------------------------------------- | ------------ |
| `@lexical/react/ExtensionComponent`                | `@gridigor/vue-lexical/ExtensionComponent`                | Same subpath |
| `@lexical/react/LexicalAutoEmbedPlugin`            | `@gridigor/vue-lexical/LexicalAutoEmbedPlugin`            | Same subpath |
| `@lexical/react/LexicalAutoFocusPlugin`            | `@gridigor/vue-lexical/LexicalAutoFocusPlugin`            | Same subpath |
| `@lexical/react/LexicalAutoLinkPlugin`             | `@gridigor/vue-lexical/LexicalAutoLinkPlugin`             | Same subpath |
| `@lexical/react/LexicalBlockWithAlignableContents` | `@gridigor/vue-lexical/LexicalBlockWithAlignableContents` | Same subpath |
| `@lexical/react/LexicalCharacterLimitPlugin`       | `@gridigor/vue-lexical/LexicalCharacterLimitPlugin`       | Same subpath |
| `@lexical/react/LexicalCheckListPlugin`            | `@gridigor/vue-lexical/LexicalCheckListPlugin`            | Same subpath |
| `@lexical/react/LexicalClearEditorPlugin`          | `@gridigor/vue-lexical/LexicalClearEditorPlugin`          | Same subpath |
| `@lexical/react/LexicalClickableLinkPlugin`        | `@gridigor/vue-lexical/LexicalClickableLinkPlugin`        | Same subpath |
| `@lexical/react/LexicalCollaborationContext`       | `@gridigor/vue-lexical/LexicalCollaborationContext`       | Same subpath |
| `@lexical/react/LexicalCollaborationPlugin`        | `@gridigor/vue-lexical/LexicalCollaborationPlugin`        | Same subpath |
| `@lexical/react/LexicalComposer`                   | `@gridigor/vue-lexical/LexicalComposer`                   | Same subpath |
| `@lexical/react/LexicalComposerContext`            | `@gridigor/vue-lexical/LexicalComposerContext`            | Same subpath |
| `@lexical/react/LexicalContentEditable`            | `@gridigor/vue-lexical/LexicalContentEditable`            | Same subpath |
| `@lexical/react/LexicalDecoratorBlockNode`         | `@gridigor/vue-lexical/LexicalDecoratorBlockNode`         | Same subpath |
| `@lexical/react/LexicalDraggableBlockPlugin`       | `@gridigor/vue-lexical/LexicalDraggableBlockPlugin`       | Same subpath |
| `@lexical/react/LexicalEditorRefPlugin`            | `@gridigor/vue-lexical/LexicalEditorRefPlugin`            | Same subpath |
| `@lexical/react/LexicalErrorBoundary`              | `@gridigor/vue-lexical/LexicalErrorBoundary`              | Same subpath |
| `@lexical/react/LexicalExtensionComposer`          | `@gridigor/vue-lexical/LexicalExtensionComposer`          | Same subpath |
| `@lexical/react/LexicalExtensionEditorComposer`    | `@gridigor/vue-lexical/LexicalExtensionEditorComposer`    | Same subpath |
| `@lexical/react/LexicalHashtagPlugin`              | `@gridigor/vue-lexical/LexicalHashtagPlugin`              | Same subpath |
| `@lexical/react/LexicalHistoryPlugin`              | `@gridigor/vue-lexical/LexicalHistoryPlugin`              | Same subpath |
| `@lexical/react/LexicalHorizontalRuleNode`         | `@gridigor/vue-lexical/LexicalHorizontalRuleNode`         | Same subpath |
| `@lexical/react/LexicalHorizontalRulePlugin`       | `@gridigor/vue-lexical/LexicalHorizontalRulePlugin`       | Same subpath |
| `@lexical/react/LexicalLinkPlugin`                 | `@gridigor/vue-lexical/LexicalLinkPlugin`                 | Same subpath |
| `@lexical/react/LexicalListPlugin`                 | `@gridigor/vue-lexical/LexicalListPlugin`                 | Same subpath |
| `@lexical/react/LexicalMarkdownShortcutPlugin`     | `@gridigor/vue-lexical/LexicalMarkdownShortcutPlugin`     | Same subpath |
| `@lexical/react/LexicalNestedComposer`             | `@gridigor/vue-lexical/LexicalNestedComposer`             | Same subpath |
| `@lexical/react/LexicalNodeContextMenuPlugin`      | `@gridigor/vue-lexical/LexicalNodeContextMenuPlugin`      | Same subpath |
| `@lexical/react/LexicalNodeEventPlugin`            | `@gridigor/vue-lexical/LexicalNodeEventPlugin`            | Same subpath |
| `@lexical/react/LexicalNodeMenuPlugin`             | `@gridigor/vue-lexical/LexicalNodeMenuPlugin`             | Same subpath |
| `@lexical/react/LexicalOnChangePlugin`             | `@gridigor/vue-lexical/LexicalOnChangePlugin`             | Same subpath |
| `@lexical/react/LexicalPlainTextPlugin`            | `@gridigor/vue-lexical/LexicalPlainTextPlugin`            | Same subpath |
| `@lexical/react/LexicalRichTextPlugin`             | `@gridigor/vue-lexical/LexicalRichTextPlugin`             | Same subpath |
| `@lexical/react/LexicalSelectionAlwaysOnDisplay`   | `@gridigor/vue-lexical/LexicalSelectionAlwaysOnDisplay`   | Same subpath |
| `@lexical/react/LexicalTabIndentationPlugin`       | `@gridigor/vue-lexical/LexicalTabIndentationPlugin`       | Same subpath |
| `@lexical/react/LexicalTableOfContentsPlugin`      | `@gridigor/vue-lexical/LexicalTableOfContentsPlugin`      | Same subpath |
| `@lexical/react/LexicalTablePlugin`                | `@gridigor/vue-lexical/LexicalTablePlugin`                | Same subpath |
| `@lexical/react/LexicalTreeView`                   | `@gridigor/vue-lexical/LexicalTreeView`                   | Same subpath |
| `@lexical/react/LexicalTypeaheadMenuPlugin`        | `@gridigor/vue-lexical/LexicalTypeaheadMenuPlugin`        | Same subpath |
| `@lexical/react/ReactExtension`                    | `@gridigor/vue-lexical/VueExtension`                      | Vue rename   |
| `@lexical/react/ReactPluginHostExtension`          | `@gridigor/vue-lexical/VuePluginHostExtension`            | Vue rename   |
| `@lexical/react/ReactProviderExtension`            | `@gridigor/vue-lexical/VueProviderExtension`              | Vue rename   |
| `@lexical/react/TreeViewExtension`                 | `@gridigor/vue-lexical/TreeViewExtension`                 | Same subpath |
| `@lexical/react/useExtensionComponent`             | `@gridigor/vue-lexical/useExtensionComponent`             | Same subpath |
| `@lexical/react/useExtensionSignalValue`           | `@gridigor/vue-lexical/useExtensionSignalValue`           | Same subpath |
| `@lexical/react/useLexicalAriaLiveRegion`          | `@gridigor/vue-lexical/useLexicalAriaLiveRegion`          | Same subpath |
| `@lexical/react/useLexicalEditable`                | `@gridigor/vue-lexical/useLexicalEditable`                | Same subpath |
| `@lexical/react/useLexicalFocusManagerRef`         | `@gridigor/vue-lexical/useLexicalFocusManagerRef`         | Same subpath |
| `@lexical/react/useLexicalFocusTrapRef`            | `@gridigor/vue-lexical/useLexicalFocusTrapRef`            | Same subpath |
| `@lexical/react/useLexicalIsTextContentEmpty`      | `@gridigor/vue-lexical/useLexicalIsTextContentEmpty`      | Same subpath |
| `@lexical/react/useLexicalNodeSelection`           | `@gridigor/vue-lexical/useLexicalNodeSelection`           | Same subpath |
| `@lexical/react/useLexicalRovingTabIndexRef`       | `@gridigor/vue-lexical/useLexicalRovingTabIndexRef`       | Same subpath |
| `@lexical/react/useLexicalSlotRef`                 | `@gridigor/vue-lexical/useLexicalSlotRef`                 | Same subpath |
| `@lexical/react/useLexicalSubscription`            | `@gridigor/vue-lexical/useLexicalSubscription`            | Same subpath |
| `@lexical/react/useLexicalTextEntity`              | `@gridigor/vue-lexical/useLexicalTextEntity`              | Same subpath |
