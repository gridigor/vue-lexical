<script setup lang="ts">
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import {
  ContentEditable,
  HistoryPlugin,
  LexicalComposer,
  RichTextPlugin,
} from '@gridigor/vue-lexical'

const initialConfig = {
  namespace: 'NuxtExample',
  editorState: () => {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('This content was initialized safely after Nuxt hydration.'),
      ),
    )
  },
  onError(error: Error) {
    throw error
  },
  theme: {
    paragraph: 'editor-paragraph',
  },
}
</script>

<template>
  <section class="editor-card" aria-labelledby="editor-title">
    <div class="editor-toolbar">
      <h2 id="editor-title">SSR-safe editor</h2>
      <span>Vue 3.5 · Nuxt 4</span>
    </div>

    <LexicalComposer :initial-config="initialConfig">
      <RichTextPlugin>
        <template #contentEditable>
          <ContentEditable class="editor-input" aria-label="Rich text editor" />
        </template>
        <template #placeholder>
          <p class="editor-placeholder">Start typing…</p>
        </template>
      </RichTextPlugin>
      <HistoryPlugin />
    </LexicalComposer>
  </section>
</template>
