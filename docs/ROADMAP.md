# API parity roadmap

The goal is behavioral parity with the framework-neutral parts of
`@lexical/react`, expressed with Vue components, slots, emits, and composables.
React-only rendering details are not copied into the public API.

## Milestone 1 — editor foundation

- [x] `LexicalComposer`
- [x] `LexicalComposerContext`
- [x] `LexicalContentEditable`
- [x] `LexicalPlainTextPlugin`
- [x] `LexicalRichTextPlugin`
- [x] `LexicalHistoryPlugin`
- [x] `LexicalOnChangePlugin`
- [x] `LexicalAutoFocusPlugin`
- [x] nested composers
- [x] decorator-node Vue portals
- [x] Vue error boundary
- [x] SSR and hydration test suite

## Milestone 2 — common plugins

- [x] clear editor
- [x] character limit and max length
- [x] link, clickable link, and auto-link
- [x] list and checklist
- [x] markdown shortcuts
- [x] hashtag text entities
- [x] generic text entity composable
- [x] delegated node events
- [x] tab indentation
- [x] horizontal rules
- [x] editable state and generic subscription composables
- [x] editor ref plugin

## Milestone 3 — advanced editing

- [x] table support and table selection
- [x] real-browser Chromium tests for table mouse selection and resizing
- [x] typeahead, node, context, and auto-embed menus
- [x] node selection
- [x] draggable blocks
- [x] collaboration with Yjs
- [x] Lexical Extension API composers, component host, signals, and full
      devtools tree view
- [x] accessibility and focus-management composables for `@lexical/a11y`
- [x] experimental Lexical node slot ref
- [x] full devtools tree view with command log, custom node printing, Export
      DOM, and time travel
- [x] experimental Collaboration V2 with external document and provider
- [x] Dragon support in plain-text and rich-text setup
- [x] Composer warning handling, guarded callback initialization, and public type aliases
- [x] public Vue `ContentEditableElement` building block and prop types
- [x] history state factory and type re-exports
- [x] public scroll-parent and dynamic menu-positioning helpers
- [x] intentional Vue-specific public API differences documented
- [x] selection always on display

## Milestone 4 — release quality

- [ ] browser tests in Chromium, Firefox, and WebKit
- [ ] accessibility tests
- [ ] bundle-size budgets and tree-shaking fixtures
- [x] packed-package Vue consumer verification
- [x] standalone Vue SPA Extension API example
- [x] Vue/Nuxt SSR example
- [x] public GitHub Pages playground deployment
- [ ] compatibility automation for each Lexical release
- [ ] API reference

## Compatibility policy

All Lexical packages are tested as one versioned set. A release supports one
Lexical minor line and declares a peer range that cannot cross into the next
minor. Vue support starts at the exact minor used by CI and extends through the
remainder of Vue 3.
