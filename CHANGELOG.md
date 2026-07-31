# Changelog

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
