# Intentional Vue API differences

`@gridigor/vue-lexical` mirrors the editor behavior and public building blocks
of `@lexical/react@0.47`, but framework-specific rendering contracts use Vue
primitives. These differences are intentional and are not missing parity.

| `@lexical/react` contract                        | Vue contract                                                                                                            | Why                                                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| React hooks such as `useLexicalComposerContext`  | Vue composables called during `setup`                                                                                   | Vue owns composable lifecycle and automatic cleanup through component scopes.                                                       |
| JSX children and render-function props           | Default, named, and scoped slots                                                                                        | Slots preserve Vue templates, reactivity, and type-aware slot props.                                                                |
| React portals                                    | Vue `Teleport`                                                                                                          | Decorators and floating menus render into Lexical-owned DOM without creating React roots.                                           |
| React context tuple with framework theme context | `useLexicalComposerContext()` returns `[editor]`; `useLexicalComposer()` returns the editor directly                    | Vue themes are supplied through Lexical configuration, so a React-only context object is unnecessary.                               |
| `forwardRef` on the editable `<div>`             | `ContentEditableElement` accepts an explicit editor; the active DOM root is available through `editor.getRootElement()` | Vue component refs do not have React `forwardRef` semantics. The `as` prop also allows a different HTML root element.               |
| `ErrorBoundary` component props                  | `LexicalErrorBoundary` with a scoped `fallback` slot and `error` emit                                                   | Vue captures descendant errors with `onErrorCaptured`.                                                                              |
| Callback props for plugin notifications          | Vue emits where the callback represents a component event, for example `@change` and `@error`                           | This integrates with normal Vue event syntax and tooling. Configuration callbacks such as `initialConfig.onError` remain callbacks. |

Vue templates use kebab-case props (`initial-config`, `on-query-change`) while
TypeScript render functions use camelCase. Standard hyphenated `aria-*`
attributes are preferred; React's legacy camelCase ARIA compatibility props
remain accepted by `ContentEditableElement`.

The legacy composer reads `initialConfig` once, matching React. The Extension
API composer is intentionally reactive and rebuilds its editor when its
`extension` or `contentEditable` input changes.
