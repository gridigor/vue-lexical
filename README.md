# @gridigor/vue-lexical

Modern Vue 3 bindings for [Lexical](https://lexical.dev), designed around the
same small, composable building blocks as `@lexical/react`.

> This project is in an early development stage. The first milestone covers
> the editor composer, context, editable root, plain/rich text registration,
> history, change notifications, and autofocus.

## Requirements

- Vue 3.5 or newer
- Lexical 0.47.x
- Node.js 22.12 or newer for development
- TypeScript 7 for this repository's toolchain

All `@lexical/*` packages used by an application must resolve to the same
version as `lexical`.

## Installation

```sh
npm install @gridigor/vue-lexical lexical vue
```

## Plain text editor

```vue
<script setup lang="ts">
import { $getRoot, type EditorState } from 'lexical'
import {
  AutoFocusPlugin,
  ContentEditable,
  HistoryPlugin,
  LexicalComposer,
  OnChangePlugin,
  PlainTextPlugin,
} from '@gridigor/vue-lexical'

const initialConfig = {
  namespace: 'MyEditor',
  onError(error: Error) {
    throw error
  },
  theme: {},
}

function onChange(editorState: EditorState) {
  editorState.read(() => {
    console.log($getRoot().getTextContent())
  })
}
</script>

<template>
  <LexicalComposer :initial-config="initialConfig">
    <PlainTextPlugin>
      <template #contentEditable>
        <ContentEditable aria-label="Editor">
          <template #placeholder>Start typing…</template>
        </ContentEditable>
      </template>
    </PlainTextPlugin>
    <OnChangePlugin @change="onChange" />
    <HistoryPlugin />
    <AutoFocusPlugin />
  </LexicalComposer>
</template>
```

Components can be imported from the package root or through subpaths matching
the Lexical naming style:

```ts
import { LexicalComposer } from '@gridigor/vue-lexical/LexicalComposer'
import { ContentEditable } from '@gridigor/vue-lexical/LexicalContentEditable'
```

Inside a plugin, access the current editor with either composable:

```ts
import {
  useLexicalComposer,
  useLexicalComposerContext,
} from '@gridigor/vue-lexical/LexicalComposerContext'

const editor = useLexicalComposer()
const [sameEditor] = useLexicalComposerContext()
```

## External editor access and clearing

Use `EditorRefPlugin` when controls outside the composer need the editor
instance. It accepts either a Vue ref or a callback. `ClearEditorPlugin`
registers the standard Lexical `CLEAR_EDITOR_COMMAND` behavior:

```vue
<script setup lang="ts">
import type { LexicalEditor } from 'lexical'
import { CLEAR_EDITOR_COMMAND } from 'lexical'
import { shallowRef } from 'vue'
import { ClearEditorPlugin, EditorRefPlugin } from '@gridigor/vue-lexical'

const editorRef = shallowRef<LexicalEditor | null>(null)

function setEditor(editor: LexicalEditor | null) {
  editorRef.value = editor
}
</script>

<template>
  <LexicalComposer :initial-config="initialConfig">
    <EditorRefPlugin :editor-ref="setEditor" />
    <ClearEditorPlugin />
    <!-- Other editor plugins -->
  </LexicalComposer>

  <button type="button" @click="editorRef?.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)">
    Clear
  </button>
</template>
```

In a Vue template, refs are automatically unwrapped when passed as props, so
the callback form is the most direct option. In render functions, a
`shallowRef` can be passed to `editorRef` without unwrapping it.

## Text limits

`CharacterLimitPlugin` keeps all entered text but wraps the part beyond the
limit in an `OverflowNode`, allowing it to be highlighted. Register that node
in the composer and use the default counter or a scoped slot:

```vue
<script setup lang="ts">
import { OverflowNode } from '@lexical/overflow'
import { CharacterLimitPlugin } from '@gridigor/vue-lexical'

const initialConfig = {
  namespace: 'LimitedEditor',
  nodes: [OverflowNode],
  onError(error: Error) {
    throw error
  },
}
</script>

<template>
  <LexicalComposer :initial-config="initialConfig">
    <!-- Editor plugins -->
    <CharacterLimitPlugin :max-length="280">
      <template #default="{ remainingCharacters, exceeded }">
        <span :class="{ exceeded }">{{ remainingCharacters }}</span>
      </template>
    </CharacterLimitPlugin>
  </LexicalComposer>
</template>
```

Set `charset="UTF-8"` to count encoded bytes instead of the default UTF-16
code units. For a hard input limit, use `<MaxLengthPlugin :max-length="280" />`;
it trims text inserted beyond the boundary.

`useLexicalIsTextContentEmpty(editor, trim)` reactively reports whether the
editor is empty. The `editor` argument can be omitted inside a composer, and
`trim` defaults to `true` in accordance with `@lexical/text`.

## Decorator nodes

`DecoratorNode` values can be Vue VNodes. The composer automatically teleports
them into the DOM element owned by the Lexical node and cleans up their Vue
component instances when the node or editor is removed.

```ts
import type { VueDecorator } from '@gridigor/vue-lexical'
import { DecoratorNode } from 'lexical'
import { h } from 'vue'
import MentionChip from './MentionChip.vue'

class MentionNode extends DecoratorNode<VueDecorator> {
  // Implement the standard Lexical node methods alongside decorate().
  decorate(): VueDecorator {
    return h(MentionChip, { name: this.getName() })
  }
}
```

Register the custom node in `initialConfig.nodes`, just as with a framework-free
Lexical editor. Decorators remain inside the same Vue application context, so
Vue provide/inject and component reactivity continue to work through the
Teleport.

## Nested editors

Use `LexicalNestedComposer` for an editor owned by another Lexical node, such as
an image caption. Create the nested editor once in the owning node and pass it
through `initialEditor`:

```vue
<script setup lang="ts">
import type { LexicalEditor } from 'lexical'
import {
  ContentEditable,
  HistoryPlugin,
  LexicalNestedComposer,
  PlainTextPlugin,
} from '@gridigor/vue-lexical'

defineProps<{ editor: LexicalEditor }>()
</script>

<template>
  <LexicalNestedComposer :initial-editor="editor">
    <PlainTextPlugin>
      <template #contentEditable>
        <ContentEditable aria-label="Image caption" />
      </template>
    </PlainTextPlugin>
    <HistoryPlugin />
  </LexicalNestedComposer>
</template>
```

The nested editor inherits its parent, theme, namespace when omitted, registered
nodes when omitted, and editable state. Set `skip-editable-listener` when the
nested editor must manage its editable state independently. To share undo/redo
across parent and nested editors, pass the same `HistoryState` instance to both
`HistoryPlugin` components through `externalHistoryState`.

## Error boundary

`LexicalErrorBoundary` isolates errors thrown by descendant Vue components. Its
scoped fallback slot receives the normalized `error`, Vue's `errorInfo`, and a
`reset` function that mounts the original subtree again:

```vue
<script setup lang="ts">
import { LexicalErrorBoundary } from '@gridigor/vue-lexical'

function reportError(error: Error, errorInfo: string) {
  console.error(error, errorInfo)
}
</script>

<template>
  <LexicalErrorBoundary @error="reportError">
    <EditorUi />

    <template #fallback="{ error, reset }">
      <p role="alert">{{ error.message }}</p>
      <button type="button" @click="reset">Try again</button>
    </template>
  </LexicalErrorBoundary>
</template>
```

Errors raised by Lexical editor updates are not consumed by this component;
they continue to use the composer's `initialConfig.onError` handler.

## SSR and Nuxt

The built-in components can render on the server without `window` or
`document`. Editor root attachment and plugin listeners are deferred until Vue
mounts the client application, so a `ClientOnly` wrapper is not required for
the built-in composer and plugins.

Lexical fills the editable DOM from its editor state after hydration. Custom
plugins and decorator components must follow the same rule as the built-ins:
access browser APIs and register DOM-dependent behavior in `onMounted`, then
clean it up in `onUnmounted`.

A runnable Nuxt 4 application is available in the
[`examples/nuxt`](https://github.com/gridigor/vue-lexical/tree/main/examples/nuxt)
directory. It renders the editor shell on the server and initializes the
Lexical state during client hydration.

## Development

```sh
npm install
npm run check
```

## Releases

Package releases are published from GitHub Releases through npm trusted
publishing. The GitHub tag must equal the version in `package.json`, with an
optional leading `v` (for example, `v0.1.0-alpha.1`). Prerelease versions are
published under the `next` dist-tag; stable versions use `latest`.

The dependency versions are intentionally pinned so CI tests the exact latest
stack selected for the release. Peer ranges remain narrow where Lexical's
cross-package contracts require aligned minor versions.

## License

MIT
