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
- [ ] SSR and hydration test suite

## Milestone 2 — common plugins

- [ ] clear editor
- [ ] character limit and max length
- [ ] link, clickable link, and auto-link
- [ ] list and checklist
- [ ] markdown shortcuts
- [ ] tab indentation
- [ ] horizontal rules
- [x] editable state and generic subscription composables
- [ ] editor ref plugin

## Milestone 3 — advanced editing

- [ ] table support and table selection
- [ ] typeahead and context menus
- [ ] node selection
- [ ] draggable blocks
- [ ] collaboration with Yjs
- [ ] speech-to-text
- [ ] selection always on display

## Milestone 4 — release quality

- [ ] browser tests in Chromium, Firefox, and WebKit
- [ ] accessibility tests
- [ ] bundle-size budgets and tree-shaking fixtures
- [ ] Vue/Nuxt SSR examples
- [ ] compatibility automation for each Lexical release
- [ ] API reference and migration guide from `lexical-vue`

## Compatibility policy

All Lexical packages are tested as one versioned set. A release supports one
Lexical minor line and declares a peer range that cannot cross into the next
minor. Vue support starts at the exact minor used by CI and extends through the
remainder of Vue 3.
