# Changelog

## 1.52.0

- Updated the supported dependency line and complete public API parity baseline
  to `@lexical/react@0.52.0` and Lexical `0.52.x`. Upstream added and removed no
  entrypoints in this release, so all 60 stay mapped, and no entrypoint this
  library mirrors gained or lost a public symbol.
- No Vue port needed changing: every one of the 60 `@lexical/react` development
  builds is byte-identical between 0.51.0 and 0.52.0, and `@lexical/devtools-core`
  is unchanged too. Upstream's work in this release is in `lexical` core,
  `@lexical/utils`, `@lexical/table`, and `@lexical/code-core`, behind APIs this
  library consumes rather than reimplements.
- Upstream removed the long-deprecated `LexicalNode.getCommonAncestor`. Nothing
  in this library used it; applications still calling it should move to
  `$getCommonAncestor` from `lexical` before upgrading.
- Upstream now warns in development builds when `editor.dispatchCommand` is
  called from a read-only context such as `editor.read`, and documents that
  `SELECTION_CHANGE_COMMAND` fires before reconciliation, so the DOM is not
  guaranteed to match the pending selection. Audited every dispatch site and
  read block in this library: all dispatches already run inside an update or a
  command listener, and no plugin here listens for `SELECTION_CHANGE_COMMAND`.
  Application code that positions DOM from that command should read the DOM in
  `$onUpdate(() => editor.read('latest', ...))`.
- Verified all 60 upstream entrypoints, the packed-package consumer, and the
  Vue/Nuxt examples against Lexical 0.52, including a single-instance check of
  the Nuxt client and Nitro server bundles and an SSR smoke test.

## 1.51.0

- Updated the supported dependency line and complete public API parity baseline
  to `@lexical/react@0.51.0` and Lexical `0.51.x`. Upstream added and removed no
  entrypoints in this release, so all 60 stay mapped.
- Migrated `DecoratorBlockNode` to Lexical's declarative serialization schema.
  The `format` property is now declared once on `$config().json`, which drives
  `exportJSON`, `updateFromJSON`, and the clone, replacing the three
  hand-written methods. Serialized output is unchanged, and the node now also
  supports the new compact export (`exportJSON(true)`).
- Passed the explicit `extends` that the upstream horizontal-rule base node now
  declares through the Vue subclass's `$config()`.
- `DecoratorBlockNode.setFormat` now returns the writable node rather than the
  receiver, matching upstream. A schema field is read straight off the instance,
  so a chain continuing from a stale reference could otherwise write or export a
  stale value.
- Followed the upstream `SerializedEditorState` change, which is no longer
  generic, in the tree-view content helper.
- Mirrored the upstream deprecation of `LexicalComposer` in favour of
  `LexicalExtensionComposer`, and the deprecation of `HorizontalRuleNode` and
  `$createHorizontalRuleNode` in favour of `HorizontalRuleExtension` from
  `@lexical/extension`. Both remain fully supported in this release.
- Stopped aliasing the `@lexical` scope to a directory in the Vue and Nuxt
  examples. Lexical 0.51 publishes `@lexical/extension` as subpath exports and
  its packages import each other through them, so a directory alias rewrites
  those to bare paths and bypasses the exports map, failing the build. The
  examples now deduplicate instead, which keeps the single Lexical instance the
  packages require. Applications that alias the scope the same way need the
  same change.
- Verified all 60 upstream entrypoints, the packed-package consumer, and the
  Vue/Nuxt examples against Lexical 0.51.

## 1.50.0

- Updated the supported dependency line and complete public API parity baseline
  to `@lexical/react@0.50.0` and Lexical `0.50.x`.
- Added the four entrypoints introduced upstream in 0.50, which split shared
  values out of the plugin component modules: `LexicalMenuOption`,
  `LexicalAutoEmbedPluginUtils`, `LexicalTypeaheadMenuPluginUtils`, and
  `LexicalCollaborationContextUtils`. As upstream does, the original modules
  keep re-exporting every symbol that moved, so existing imports are unchanged.
- Mapped the upstream `newContext` factory to the Vue
  `createCollaborationContext` equivalent in the parity audit.
- Each public module is now its own build entry, so every documented subpath
  keeps its full export surface instead of only the exports reachable from the
  package root.
- Verified all 60 upstream entrypoints, the packed-package consumer, and the
  Vue/Nuxt examples against Lexical 0.50.

## 1.49.0

- Starting with this release, the Vue Lexical minor version tracks the supported
  Lexical minor line: `1.49.x` corresponds to Lexical `0.49.x`, `1.50.x` will
  correspond to Lexical `0.50.x`, and so on.
- Updated the supported dependency line and complete public API parity baseline
  to `@lexical/react@0.49.0`.
- Migrated the Vue horizontal-rule node to Lexical's `$config()` protocol.
- Adopted the invariant-safe `AnyLexicalCommand` type in the devtools command log.
- Replaced deprecated table-selection shape checks with the merged-cell-aware
  table-map boundary APIs introduced in Lexical 0.49.
- Verified all 56 upstream entrypoints and the Vue/Nuxt examples against the
  Lexical 0.49 built-in node and command changes.

## 1.1.0

- Updated the supported dependency line and complete public API parity baseline
  to `@lexical/react@0.48.0`.
- Added custom Yjs shared-type root names to both collaboration plugins.
- Ported the Lexical 0.48 character-limit fixes for block separators and
  adjacent overflow nodes.
- Made read-only content-editable roots leave the tab order by default while
  preserving an explicitly supplied `tabindex`.
- Prevented native WebKit selection from replacing a mouse-driven table
  selection after the Lexical 0.48 table observer update.
- Added a CI baseline guard so a future Lexical minor release requires an
  explicit compatibility audit even when the existing test suite passes.

## 1.0.0

- Complete Vue mapping for all 56 public `@lexical/react@0.47.0` entrypoints
  and every named public symbol.
- Vue components, composables, scoped slots, emits, and Teleport equivalents
  for the legacy plugin API and Lexical Extension API.
- Rich text, block editing, menus, tables, Yjs collaboration, accessibility,
  developer tools, SSR/hydration, and cross-browser coverage.
- Symbol-level API parity, generated API reference, bundle budgets,
  tree-shaking fixtures, packed-consumer verification, and compatibility CI.
