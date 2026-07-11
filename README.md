# @gridigor/vue-lexical

Modern Vue 3 bindings for [Lexical](https://lexical.dev), designed around the
same small, composable building blocks as `@lexical/react`.

> This project is in an early development stage. The first milestone covers
> the editor composer, context, editable root, plain/rich text registration,
> history, change notifications, and autofocus.

## Requirements

- Vue 3.5.39 or newer
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

## Development

```sh
npm install
npm run check
```

The dependency versions are intentionally pinned so CI tests the exact latest
stack selected for the release. Peer ranges remain narrow where Lexical's
cross-package contracts require aligned minor versions.

## License

MIT
