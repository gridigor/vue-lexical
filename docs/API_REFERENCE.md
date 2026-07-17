# API reference

This file is generated from the public exports of `@gridigor/vue-lexical@1.1.0`.
Run `npm run generate:api-reference` after changing the public API. CI runs
`npm run check:api-reference` and fails when this reference is stale.

All 260 named exports are available from the package root. Every
section also shows its tree-shakeable subpath import. Usage guides and complete
examples remain in the [README](../README.md); Vue-specific contract differences
are documented separately in [Vue API differences](./VUE_API_DIFFERENCES.md).

## `LexicalComposer`

Import from the package root or from `@gridigor/vue-lexical/LexicalComposer`.

| Export                   | Kind          | Description      |
| ------------------------ | ------------- | ---------------- |
| `LexicalComposer`        | Vue component | Vue component.   |
| `InitialConfig`          | Type          | TypeScript type. |
| `InitialConfigType`      | Type          | TypeScript type. |
| `InitialEditorState`     | Type          | TypeScript type. |
| `InitialEditorStateType` | Type          | TypeScript type. |

## `ExtensionComponent`

Import from the package root or from `@gridigor/vue-lexical/ExtensionComponent`.

| Export                    | Kind          | Description      |
| ------------------------- | ------------- | ---------------- |
| `ExtensionComponent`      | Vue component | Vue component.   |
| `ExtensionComponentProps` | Type          | TypeScript type. |

## `LexicalCollaborationContext`

Import from the package root or from `@gridigor/vue-lexical/LexicalCollaborationContext`.

| Export                       | Kind          | Description      |
| ---------------------------- | ------------- | ---------------- |
| `collaborationContextKey`    | Constant      | Public constant. |
| `createCollaborationContext` | Function      | Public function. |
| `LexicalCollaboration`       | Vue component | Vue component.   |
| `useCollaborationContext`    | Composable    | Vue composable.  |
| `CollaborationContext`       | Type          | TypeScript type. |
| `CollaborationContextType`   | Type          | TypeScript type. |

## `LexicalCollaborationPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalCollaborationPlugin`.

| Export                                | Kind          | Description      |
| ------------------------------------- | ------------- | ---------------- |
| `CollaborationPlugin`                 | Vue component | Vue component.   |
| `CollaborationPluginV2__EXPERIMENTAL` | Vue component | Vue component.   |
| `LexicalCollaborationPlugin`          | Vue component | Vue component.   |
| `CollaborationPluginProps`            | Type          | TypeScript type. |
| `CollaborationPluginV2Props`          | Type          | TypeScript type. |
| `CollaborationProviderFactory`        | Type          | TypeScript type. |
| `CursorsContainer`                    | Type          | TypeScript type. |

## `LexicalComposerContext`

Import from the package root or from `@gridigor/vue-lexical/LexicalComposerContext`.

| Export                             | Kind       | Description                                                                         |
| ---------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `createLexicalComposerContext`     | Function   | Creates a theme context with the same parent fallback semantics as @lexical/react.  |
| `LexicalComposerContext`           | Constant   | Public constant.                                                                    |
| `lexicalComposerContextKey`        | Constant   | Public constant.                                                                    |
| `useLexicalComposer`               | Composable | Vue composable.                                                                     |
| `useLexicalComposerContext`        | Composable | Vue composable.                                                                     |
| `LexicalComposerContextType`       | Type       | Framework context stored alongside an editor, matching the upstream theme contract. |
| `LexicalComposerContextWithEditor` | Type       | Editor and framework context exposed by the nearest composer.                       |

## `LexicalExtensionComposer`

Import from the package root or from `@gridigor/vue-lexical/LexicalExtensionComposer`.

| Export                          | Kind          | Description                                                                                    |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `LexicalExtensionComposer`      | Vue component | Vue component.                                                                                 |
| `LexicalExtensionComposerProps` | Type          | Props for the extension-owned editor composer; children are supplied through the default slot. |

## `LexicalExtensionEditorComposer`

Import from the package root or from `@gridigor/vue-lexical/LexicalExtensionEditorComposer`.

| Export                                | Kind          | Description                                               |
| ------------------------------------- | ------------- | --------------------------------------------------------- |
| `LexicalExtensionEditorComposer`      | Vue component | Vue component.                                            |
| `LexicalExtensionEditorComposerProps` | Type          | Props for rendering an externally owned extension editor. |

## `LexicalContentEditable`

Import from the package root or from `@gridigor/vue-lexical/LexicalContentEditable`.

| Export                        | Kind          | Description                                                              |
| ----------------------------- | ------------- | ------------------------------------------------------------------------ |
| `ContentEditable`             | Vue component | Editable surface that reads its editor from the nearest LexicalComposer. |
| `ContentEditableElement`      | Vue component | Lower-level editable surface that binds an explicitly supplied editor.   |
| `LexicalContentEditable`      | Vue component | Editable surface that reads its editor from the nearest LexicalComposer. |
| `ContentEditableElementProps` | Type          | TypeScript type.                                                         |
| `ContentEditableProps`        | Type          | TypeScript type.                                                         |

## `LexicalBlockWithAlignableContents`

Import from the package root or from `@gridigor/vue-lexical/LexicalBlockWithAlignableContents`.

| Export                                | Kind          | Description                                                    |
| ------------------------------------- | ------------- | -------------------------------------------------------------- |
| `BlockWithAlignableContents`          | Vue component | Wraps a decorator block with selection and alignment behavior. |
| `LexicalBlockWithAlignableContents`   | Vue component | Wraps a decorator block with selection and alignment behavior. |
| `BlockWithAlignableContentsClassName` | Type          | TypeScript type.                                               |
| `BlockWithAlignableContentsProps`     | Type          | TypeScript type.                                               |

## `LexicalDecoratorBlockNode`

Import from the package root or from `@gridigor/vue-lexical/LexicalDecoratorBlockNode`.

| Export                         | Kind     | Description      |
| ------------------------------ | -------- | ---------------- |
| `$isDecoratorBlockNode`        | Function | Public function. |
| `DecoratorBlockNode`           | Class    | Public class.    |
| `SerializedDecoratorBlockNode` | Type     | TypeScript type. |

## `LexicalDecorators`

Import from the package root or from `@gridigor/vue-lexical/LexicalDecorators`.

| Export              | Kind          | Description      |
| ------------------- | ------------- | ---------------- |
| `LexicalDecorators` | Vue component | Vue component.   |
| `VueDecorator`      | Type          | TypeScript type. |

## `LexicalDraggableBlockPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalDraggableBlockPlugin`.

| Export                              | Kind          | Description                                                                  |
| ----------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `DraggableBlockPlugin`              | Vue component | Reorders top-level blocks with a Teleported Vue drag handle and target line. |
| `DraggableBlockPlugin_EXPERIMENTAL` | Vue component | Reorders top-level blocks with a Teleported Vue drag handle and target line. |
| `LexicalDraggableBlockPlugin`       | Vue component | Reorders top-level blocks with a Teleported Vue drag handle and target line. |
| `DraggableBlockPluginProps`         | Type          | TypeScript type.                                                             |
| `DraggableBlockSlotProps`           | Type          | TypeScript type.                                                             |

## `LexicalErrorBoundary`

Import from the package root or from `@gridigor/vue-lexical/LexicalErrorBoundary`.

| Export                          | Kind          | Description                                                                  |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `LexicalErrorBoundary`          | Vue component | Vue component.                                                               |
| `LexicalErrorBoundaryProps`     | Type          | Vue listener props for LexicalErrorBoundary; content and fallback use slots. |
| `LexicalErrorBoundarySlotProps` | Type          | TypeScript type.                                                             |

## `LexicalNestedComposer`

Import from the package root or from `@gridigor/vue-lexical/LexicalNestedComposer`.

| Export                       | Kind          | Description      |
| ---------------------------- | ------------- | ---------------- |
| `LexicalNestedComposer`      | Vue component | Vue component.   |
| `LexicalNestedComposerProps` | Type          | TypeScript type. |

## `LexicalAutoFocusPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalAutoFocusPlugin`.

| Export                   | Kind          | Description    |
| ------------------------ | ------------- | -------------- |
| `AutoFocusPlugin`        | Vue component | Vue component. |
| `LexicalAutoFocusPlugin` | Vue component | Vue component. |

## `LexicalAutoEmbedPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalAutoEmbedPlugin`.

| Export                   | Kind          | Description      |
| ------------------------ | ------------- | ---------------- |
| `AutoEmbedOption`        | Class         | Public class.    |
| `AutoEmbedPlugin`        | Vue component | Vue component.   |
| `INSERT_EMBED_COMMAND`   | Constant      | Public constant. |
| `LexicalAutoEmbedPlugin` | Vue component | Vue component.   |
| `URL_MATCHER`            | Constant      | Public constant. |
| `AutoEmbedPluginProps`   | Type          | TypeScript type. |
| `EmbedConfig`            | Type          | TypeScript type. |
| `EmbedMatchResult`       | Type          | TypeScript type. |

## `LexicalAutoLinkPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalAutoLinkPlugin`.

| Export                        | Kind          | Description                                                         |
| ----------------------------- | ------------- | ------------------------------------------------------------------- |
| `AutoLinkPlugin`              | Vue component | Converts matching text to AutoLinkNode instances as the user types. |
| `LexicalAutoLinkPlugin`       | Vue component | Converts matching text to AutoLinkNode instances as the user types. |
| `createLinkMatcherWithRegExp` | Function      | Public function.                                                    |
| `registerAutoLink`            | Function      | Public function.                                                    |
| `AutoLinkPluginProps`         | Type          | TypeScript type.                                                    |
| `ChangeHandler`               | Type          | TypeScript type.                                                    |
| `LinkMatcher`                 | Type          | TypeScript type.                                                    |

## `LexicalCharacterLimitPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalCharacterLimitPlugin`.

| Export                        | Kind          | Description      |
| ----------------------------- | ------------- | ---------------- |
| `CharacterLimitPlugin`        | Vue component | Vue component.   |
| `LexicalCharacterLimitPlugin` | Vue component | Vue component.   |
| `CharacterLimitCharset`       | Type          | TypeScript type. |
| `CharacterLimitSlotProps`     | Type          | TypeScript type. |

## `LexicalCheckListPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalCheckListPlugin`.

| Export                   | Kind          | Description                                                       |
| ------------------------ | ------------- | ----------------------------------------------------------------- |
| `CheckListPlugin`        | Vue component | Registers keyboard and pointer interactions for check-list items. |
| `LexicalCheckListPlugin` | Vue component | Registers keyboard and pointer interactions for check-list items. |
| `registerCheckList`      | Function      | Public function.                                                  |
| `CheckListPluginProps`   | Type          | TypeScript type.                                                  |

## `LexicalClearEditorPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalClearEditorPlugin`.

| Export                     | Kind          | Description    |
| -------------------------- | ------------- | -------------- |
| `ClearEditorPlugin`        | Vue component | Vue component. |
| `LexicalClearEditorPlugin` | Vue component | Vue component. |

## `LexicalClickableLinkPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalClickableLinkPlugin`.

| Export                       | Kind          | Description                                                        |
| ---------------------------- | ------------- | ------------------------------------------------------------------ |
| `ClickableLinkPlugin`        | Vue component | Opens links when clicked, including while the editor is read-only. |
| `LexicalClickableLinkPlugin` | Vue component | Opens links when clicked, including while the editor is read-only. |
| `registerClickableLink`      | Function      | Public function.                                                   |
| `ClickableLinkPluginProps`   | Type          | TypeScript type.                                                   |

## `LexicalEditorRefPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalEditorRefPlugin`.

| Export                   | Kind          | Description      |
| ------------------------ | ------------- | ---------------- |
| `EditorRefPlugin`        | Vue component | Vue component.   |
| `LexicalEditorRefPlugin` | Vue component | Vue component.   |
| `LexicalEditorRef`       | Type          | TypeScript type. |

## `LexicalHistoryPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalHistoryPlugin`.

| Export                    | Kind          | Description      |
| ------------------------- | ------------- | ---------------- |
| `createEmptyHistoryState` | Function      | Public function. |
| `HistoryPlugin`           | Vue component | Vue component.   |
| `LexicalHistoryPlugin`    | Vue component | Vue component.   |
| `HistoryState`            | Type          | TypeScript type. |

## `LexicalHorizontalRuleNode`

Import from the package root or from `@gridigor/vue-lexical/LexicalHorizontalRuleNode`.

| Export                           | Kind     | Description                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------- |
| `$createHorizontalRuleNode`      | Function | Public function.                                              |
| `$isHorizontalRuleNode`          | Function | Public function.                                              |
| `HorizontalRuleNode`             | Class    | Horizontal rule node with Vue-powered node-selection styling. |
| `INSERT_HORIZONTAL_RULE_COMMAND` | Export   | Public export.                                                |
| `SerializedHorizontalRuleNode`   | Type     | TypeScript type.                                              |

## `LexicalHorizontalRulePlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalHorizontalRulePlugin`.

| Export                        | Kind          | Description                                                            |
| ----------------------------- | ------------- | ---------------------------------------------------------------------- |
| `HorizontalRulePlugin`        | Vue component | Registers INSERT_HORIZONTAL_RULE_COMMAND for the legacy component API. |
| `LexicalHorizontalRulePlugin` | Vue component | Registers INSERT_HORIZONTAL_RULE_COMMAND for the legacy component API. |

## `LexicalHashtagPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalHashtagPlugin`.

| Export                   | Kind          | Description                                         |
| ------------------------ | ------------- | --------------------------------------------------- |
| `HashtagPlugin`          | Vue component | Transforms hashtag text into HashtagNode instances. |
| `LexicalHashtagPlugin`   | Vue component | Transforms hashtag text into HashtagNode instances. |
| `registerLexicalHashtag` | Function      | Public function.                                    |
| `HashtagConfig`          | Type          | TypeScript type.                                    |

## `LexicalLinkPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalLinkPlugin`.

| Export              | Kind          | Description                                                                |
| ------------------- | ------------- | -------------------------------------------------------------------------- |
| `LexicalLinkPlugin` | Vue component | Registers link commands and normalization for editors containing LinkNode. |
| `LinkPlugin`        | Vue component | Registers link commands and normalization for editors containing LinkNode. |
| `registerLink`      | Function      | Public function.                                                           |
| `LinkAttributes`    | Type          | TypeScript type.                                                           |
| `LinkPluginProps`   | Type          | TypeScript type.                                                           |

## `LexicalListPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalListPlugin`.

| Export                              | Kind          | Description                                                               |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------- |
| `LexicalListPlugin`                 | Vue component | Registers ordered and unordered list commands and shared list transforms. |
| `ListPlugin`                        | Vue component | Registers ordered and unordered list commands and shared list transforms. |
| `registerList`                      | Function      | Public function.                                                          |
| `registerListStrictIndentTransform` | Function      | Public function.                                                          |
| `ListPluginProps`                   | Type          | TypeScript type.                                                          |
| `RegisterListOptions`               | Type          | TypeScript type.                                                          |

## `LexicalMarkdownShortcutPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalMarkdownShortcutPlugin`.

| Export                          | Kind          | Description                                                           |
| ------------------------------- | ------------- | --------------------------------------------------------------------- |
| `DEFAULT_TRANSFORMERS`          | Constant      | The standard Markdown transformers plus the horizontal-rule shortcut. |
| `LexicalMarkdownShortcutPlugin` | Vue component | Converts Markdown syntax to Lexical nodes as the user types.          |
| `MarkdownShortcutPlugin`        | Vue component | Converts Markdown syntax to Lexical nodes as the user types.          |
| `registerMarkdownShortcuts`     | Function      | Public function.                                                      |
| `ElementTransformer`            | Type          | TypeScript type.                                                      |
| `MarkdownShortcutPluginProps`   | Type          | TypeScript type.                                                      |
| `Transformer`                   | Type          | TypeScript type.                                                      |

## `LexicalMaxLengthPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalMaxLengthPlugin`.

| Export                   | Kind          | Description    |
| ------------------------ | ------------- | -------------- |
| `LexicalMaxLengthPlugin` | Vue component | Vue component. |
| `MaxLengthPlugin`        | Vue component | Vue component. |

## `LexicalNodeContextMenuPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalNodeContextMenuPlugin`.

| Export                         | Kind          | Description      |
| ------------------------------ | ------------- | ---------------- |
| `LexicalNodeContextMenuPlugin` | Vue component | Vue component.   |
| `NodeContextMenuOption`        | Class         | Public class.    |
| `NodeContextMenuPlugin`        | Vue component | Vue component.   |
| `NodeContextMenuSeparator`     | Class         | Public class.    |
| `NodeContextMenuItem`          | Type          | TypeScript type. |
| `NodeContextMenuOptionConfig`  | Type          | TypeScript type. |
| `NodeContextMenuPluginProps`   | Type          | TypeScript type. |
| `NodeContextMenuSlotProps`     | Type          | TypeScript type. |

## `LexicalNodeEventPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalNodeEventPlugin`.

| Export                   | Kind          | Description                                                                                                                                        |
| ------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LexicalNodeEventPlugin` | Vue component | Delegates a DOM event from the editor root to matching Lexical nodes. Mouse enter and leave use capture semantics and only match the nearest node. |
| `NodeEventPlugin`        | Vue component | Delegates a DOM event from the editor root to matching Lexical nodes. Mouse enter and leave use capture semantics and only match the nearest node. |
| `NodeEventListener`      | Type          | TypeScript type.                                                                                                                                   |
| `NodeEventPluginProps`   | Type          | TypeScript type.                                                                                                                                   |

## `LexicalNodeMenuPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalNodeMenuPlugin`.

| Export                  | Kind          | Description      |
| ----------------------- | ------------- | ---------------- |
| `LexicalNodeMenuPlugin` | Vue component | Vue component.   |
| `NodeMenuPlugin`        | Vue component | Vue component.   |
| `NodeMenuPluginProps`   | Type          | TypeScript type. |

## `LexicalOnChangePlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalOnChangePlugin`.

| Export                  | Kind          | Description    |
| ----------------------- | ------------- | -------------- |
| `OnChangePlugin`        | Vue component | Vue component. |
| `LexicalOnChangePlugin` | Vue component | Vue component. |

## `LexicalPlainTextPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalPlainTextPlugin`.

| Export                   | Kind          | Description      |
| ------------------------ | ------------- | ---------------- |
| `PlainTextPlugin`        | Vue component | Vue component.   |
| `LexicalPlainTextPlugin` | Vue component | Vue component.   |
| `PlainTextPluginProps`   | Type          | TypeScript type. |

## `LexicalRichTextPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalRichTextPlugin`.

| Export                  | Kind          | Description      |
| ----------------------- | ------------- | ---------------- |
| `RichTextPlugin`        | Vue component | Vue component.   |
| `LexicalRichTextPlugin` | Vue component | Vue component.   |
| `RichTextPluginProps`   | Type          | TypeScript type. |

## `LexicalSelectionAlwaysOnDisplay`

Import from the package root or from `@gridigor/vue-lexical/LexicalSelectionAlwaysOnDisplay`.

| Export                            | Kind          | Description                                                      |
| --------------------------------- | ------------- | ---------------------------------------------------------------- |
| `LexicalSelectionAlwaysOnDisplay` | Vue component | Keeps a DOM highlight visible while focus is outside the editor. |
| `SelectionAlwaysOnDisplay`        | Vue component | Keeps a DOM highlight visible while focus is outside the editor. |
| `SelectionRepositionHandler`      | Type          | TypeScript type.                                                 |

## `LexicalTabIndentationPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalTabIndentationPlugin`.

| Export                        | Kind          | Description                                                                                                                                                                        |
| ----------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LexicalTabIndentationPlugin` | Vue component | Handles Tab and Shift+Tab as indent and outdent commands. This can trap keyboard focus inside the editor, so applications should enable it only when that behavior is intentional. |
| `TabIndentationPlugin`        | Vue component | Handles Tab and Shift+Tab as indent and outdent commands. This can trap keyboard focus inside the editor, so applications should enable it only when that behavior is intentional. |
| `registerTabIndentation`      | Function      | Public function.                                                                                                                                                                   |
| `CanIndentPredicate`          | Type          | TypeScript type.                                                                                                                                                                   |
| `TabIndentationPluginProps`   | Type          | TypeScript type.                                                                                                                                                                   |

## `LexicalTableCellResizer`

Import from the package root or from `@gridigor/vue-lexical/LexicalTableCellResizer`.

| Export                        | Kind          | Description                                                     |
| ----------------------------- | ------------- | --------------------------------------------------------------- |
| `LexicalTableCellResizer`     | Vue component | Adds draggable row and column resize handles to Lexical tables. |
| `TABLE_CELL_MIN_COLUMN_WIDTH` | Constant      | Public constant.                                                |
| `TABLE_CELL_MIN_ROW_HEIGHT`   | Constant      | Public constant.                                                |
| `TableCellResizer`            | Vue component | Adds draggable row and column resize handles to Lexical tables. |
| `TableCellResizeDirection`    | Type          | TypeScript type.                                                |

## `LexicalTableOfContentsPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalTableOfContentsPlugin`.

| Export                         | Kind          | Description                                                                      |
| ------------------------------ | ------------- | -------------------------------------------------------------------------------- |
| `LexicalTableOfContentsPlugin` | Vue component | Tracks all headings in document order and exposes them through the default slot. |
| `TableOfContentsPlugin`        | Vue component | Tracks all headings in document order and exposes them through the default slot. |
| `TableOfContentsEntry`         | Type          | A heading key, its current text, and its heading tag.                            |
| `TableOfContentsSlotProps`     | Type          | TypeScript type.                                                                 |

## `LexicalTreeView`

Import from the package root or from `@gridigor/vue-lexical/LexicalTreeView`.

| Export                    | Kind          | Description                                                                                                                             |
| ------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `generateTreeViewContent` | Function      | Generates the lightweight tree/JSON output used by earlier releases. For the complete devtools output, render {@link TreeView} instead. |
| `LexicalTreeView`         | Vue component | Vue component.                                                                                                                          |
| `TreeView`                | Vue component | Vue component.                                                                                                                          |
| `CustomPrintNodeFn`       | Type          | TypeScript type.                                                                                                                        |
| `LexicalCommandEntry`     | Type          | TypeScript type.                                                                                                                        |
| `LexicalCommandLog`       | Type          | TypeScript type.                                                                                                                        |
| `TreeViewProps`           | Type          | TypeScript type.                                                                                                                        |

## `LexicalTablePlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalTablePlugin`.

| Export                             | Kind          | Description                                                                |
| ---------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `$createTableCellNode`             | Function      | Public function.                                                           |
| `$createTableNode`                 | Function      | Public function.                                                           |
| `$createTableNodeWithDimensions`   | Function      | Public function.                                                           |
| `$createTableRowNode`              | Function      | Public function.                                                           |
| `$isScrollableTablesActive`        | Function      | Public function.                                                           |
| `$isTableCellNode`                 | Function      | Public function.                                                           |
| `$isTableNode`                     | Function      | Public function.                                                           |
| `$isTableRowNode`                  | Function      | Public function.                                                           |
| `INSERT_TABLE_COMMAND`             | Export        | Public export.                                                             |
| `LexicalTablePlugin`               | Vue component | Enables Lexical table commands, integrity transforms, and table selection. |
| `setScrollableTablesActive`        | Function      | Public function.                                                           |
| `TableCellHeaderStates`            | Export        | Public export.                                                             |
| `TableCellNode`                    | Export        | Public export.                                                             |
| `TableNode`                        | Export        | Public export.                                                             |
| `TablePlugin`                      | Vue component | Enables Lexical table commands, integrity transforms, and table selection. |
| `TableRowNode`                     | Export        | Public export.                                                             |
| `InsertTableCommandPayload`        | Type          | TypeScript type.                                                           |
| `InsertTableCommandPayloadHeaders` | Type          | TypeScript type.                                                           |
| `TablePluginProps`                 | Type          | TypeScript type.                                                           |

## `LexicalTypeaheadMenuPlugin`

Import from the package root or from `@gridigor/vue-lexical/LexicalTypeaheadMenuPlugin`.

| Export                                      | Kind          | Description      |
| ------------------------------------------- | ------------- | ---------------- |
| `createBasicTypeaheadTriggerMatch`          | Function      | Public function. |
| `getScrollParent`                           | Constant      |                  |
| `LexicalTypeaheadMenuPlugin`                | Vue component | Vue component.   |
| `MenuOption`                                | Export        | Public export.   |
| `PUNCTUATION`                               | Constant      | Public constant. |
| `SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND` | Constant      | Public constant. |
| `TypeaheadMenuPlugin`                       | Vue component | Vue component.   |
| `useBasicTypeaheadTriggerMatch`             | Function      | Public function. |
| `useDynamicPositioning`                     | Composable    | Vue composable.  |
| `BasicTypeaheadTriggerOptions`              | Type          | TypeScript type. |
| `MenuResolution`                            | Type          | TypeScript type. |
| `MenuSlotProps`                             | Type          | TypeScript type. |
| `MenuTextMatch`                             | Type          | TypeScript type. |
| `TriggerFn`                                 | Type          | TypeScript type. |
| `TypeaheadMenuPluginProps`                  | Type          | TypeScript type. |

## `TreeViewExtension`

Import from the package root or from `@gridigor/vue-lexical/TreeViewExtension`.

| Export                       | Kind          | Description      |
| ---------------------------- | ------------- | ---------------- |
| `TreeViewExtension`          | Constant      | Public constant. |
| `TreeViewExtensionComponent` | Vue component | Vue component.   |
| `ResolvedTreeViewConfig`     | Type          | TypeScript type. |
| `TreeViewConfig`             | Type          | TypeScript type. |

## `VueExtension`

Import from the package root or from `@gridigor/vue-lexical/VueExtension`.

| Export                           | Kind     | Description                                                        |
| -------------------------------- | -------- | ------------------------------------------------------------------ |
| `configureVueExtension`          | Function | Public function.                                                   |
| `DefaultEditorChildrenComponent` | Function | Public function.                                                   |
| `VueExtension`                   | Constant | Vue component integration used by extension-built Lexical editors. |
| `EditorChildrenComponent`        | Type     | TypeScript type.                                                   |
| `EditorChildrenComponentProps`   | Type     | TypeScript type.                                                   |
| `VueConfig`                      | Type     | TypeScript type.                                                   |
| `VueExtensionContentEditable`    | Type     | TypeScript type.                                                   |
| `VueExtensionDecorator`          | Type     | TypeScript type.                                                   |
| `VueOutputs`                     | Type     | TypeScript type.                                                   |

## `VuePluginHostExtension`

Import from the package root or from `@gridigor/vue-lexical/VuePluginHostExtension`.

| Export                                 | Kind     | Description                                                      |
| -------------------------------------- | -------- | ---------------------------------------------------------------- |
| `mountVueExtensionComponent`           | Function | Public function.                                                 |
| `mountVuePluginComponent`              | Function | Public function.                                                 |
| `mountVuePluginElement`                | Function | Mounts an already-created Vue VNode in the editor's plugin host. |
| `mountVuePluginHost`                   | Function | Public function.                                                 |
| `VUE_PLUGIN_HOST_MOUNT_PLUGIN_COMMAND` | Constant | Public constant.                                                 |
| `VUE_PLUGIN_HOST_MOUNT_ROOT_COMMAND`   | Constant | Public constant.                                                 |
| `VuePluginHostExtension`               | Constant | Public constant.                                                 |
| `MountVuePluginCommandArg`             | Type     | TypeScript type.                                                 |
| `VuePluginHostDecoratorProps`          | Type     | TypeScript type.                                                 |
| `VuePluginHostMountCommandArg`         | Type     | TypeScript type.                                                 |
| `VuePluginHostOutput`                  | Type     | TypeScript type.                                                 |

## `VueProviderExtension`

Import from the package root or from `@gridigor/vue-lexical/VueProviderExtension`.

| Export                 | Kind     | Description                                                                                                                                                                            |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VueProviderExtension` | Constant | Declares that an extension-built editor has a Vue component host available. Vue-dependent extensions can use this as a peer dependency without importing any component implementation. |

## `useExtensionComponent`

Import from the package root or from `@gridigor/vue-lexical/useExtensionComponent`.

| Export                           | Kind       | Description     |
| -------------------------------- | ---------- | --------------- |
| `useExtensionComponent`          | Composable | Vue composable. |
| `useExtensionDependency`         | Composable | Vue composable. |
| `useOptionalExtensionDependency` | Composable | Vue composable. |
| `usePeerExtensionDependency`     | Composable | Vue composable. |

## `useExtensionSignalValue`

Import from the package root or from `@gridigor/vue-lexical/useExtensionSignalValue`.

| Export                    | Kind       | Description      |
| ------------------------- | ---------- | ---------------- |
| `useExtensionSignalValue` | Composable | Vue composable.  |
| `useSignalValue`          | Composable | Vue composable.  |
| `SignalValue`             | Type       | TypeScript type. |

## `useLexicalEditable`

Import from the package root or from `@gridigor/vue-lexical/useLexicalEditable`.

| Export               | Kind       | Description     |
| -------------------- | ---------- | --------------- |
| `useLexicalEditable` | Composable | Vue composable. |

## `useLexicalAriaLiveRegion`

Import from the package root or from `@gridigor/vue-lexical/useLexicalAriaLiveRegion`.

| Export                     | Kind       | Description     |
| -------------------------- | ---------- | --------------- |
| `useLexicalAriaLiveRegion` | Composable | Vue composable. |

## `useLexicalExtensionElementRef`

Import from the package root or from `@gridigor/vue-lexical/useLexicalExtensionElementRef`.

| Export              | Kind | Description      |
| ------------------- | ---- | ---------------- |
| `LexicalElementRef` | Type | TypeScript type. |

## `useLexicalFocusManagerRef`

Import from the package root or from `@gridigor/vue-lexical/useLexicalFocusManagerRef`.

| Export                      | Kind       | Description      |
| --------------------------- | ---------- | ---------------- |
| `useLexicalFocusManagerRef` | Composable | Vue composable.  |
| `FocusManagerOptions`       | Type       | TypeScript type. |

## `useLexicalFocusTrapRef`

Import from the package root or from `@gridigor/vue-lexical/useLexicalFocusTrapRef`.

| Export                   | Kind       | Description      |
| ------------------------ | ---------- | ---------------- |
| `useLexicalFocusTrapRef` | Composable | Vue composable.  |
| `FocusTrapInitialFocus`  | Type       | TypeScript type. |

## `useLexicalIsTextContentEmpty`

Import from the package root or from `@gridigor/vue-lexical/useLexicalIsTextContentEmpty`.

| Export                         | Kind       | Description     |
| ------------------------------ | ---------- | --------------- |
| `useLexicalIsTextContentEmpty` | Composable | Vue composable. |

## `useLexicalNodeSelection`

Import from the package root or from `@gridigor/vue-lexical/useLexicalNodeSelection`.

| Export                      | Kind       | Description                                                      |
| --------------------------- | ---------- | ---------------------------------------------------------------- |
| `useLexicalNodeSelection`   | Composable | Tracks and updates the NodeSelection state for one Lexical node. |
| `ClearLexicalNodeSelection` | Type       | TypeScript type.                                                 |
| `LexicalNodeSelection`      | Type       | TypeScript type.                                                 |
| `SetLexicalNodeSelected`    | Type       | TypeScript type.                                                 |

## `useLexicalSubscription`

Import from the package root or from `@gridigor/vue-lexical/useLexicalSubscription`.

| Export                   | Kind       | Description      |
| ------------------------ | ---------- | ---------------- |
| `useLexicalSubscription` | Composable | Vue composable.  |
| `LexicalSubscription`    | Type       | TypeScript type. |

## `useLexicalRovingTabIndexRef`

Import from the package root or from `@gridigor/vue-lexical/useLexicalRovingTabIndexRef`.

| Export                        | Kind       | Description      |
| ----------------------------- | ---------- | ---------------- |
| `useLexicalRovingTabIndexRef` | Composable | Vue composable.  |
| `RovingOrientation`           | Type       | TypeScript type. |
| `RovingTabIndexOptions`       | Type       | TypeScript type. |

## `useLexicalSlotRef`

Import from the package root or from `@gridigor/vue-lexical/useLexicalSlotRef`.

| Export              | Kind       | Description     |
| ------------------- | ---------- | --------------- |
| `useLexicalSlotRef` | Composable | Vue composable. |

## `useLexicalTextEntity`

Import from the package root or from `@gridigor/vue-lexical/useLexicalTextEntity`.

| Export                      | Kind       | Description                                                                                                                          |
| --------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `registerLexicalTextEntity` | Function   | Public function.                                                                                                                     |
| `useLexicalTextEntity`      | Composable | Registers transforms that wrap matched text in a custom text entity node and turn it back into plain text when it no longer matches. |
| `EntityMatch`               | Type       | TypeScript type.                                                                                                                     |
| `TextEntityMatcher`         | Type       | TypeScript type.                                                                                                                     |
| `TextEntityNodeFactory`     | Type       | TypeScript type.                                                                                                                     |
