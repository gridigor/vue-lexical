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
