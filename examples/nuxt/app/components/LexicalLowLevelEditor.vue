<script setup lang="ts">
import type { LexicalEditor } from 'lexical'
import type { HistoryState } from '@gridigor/vue-lexical'
import {
  ContentEditableElement,
  HistoryPlugin,
  LexicalNestedComposer,
  PlainTextPlugin,
} from '@gridigor/vue-lexical'

const props = defineProps<{
  editor: LexicalEditor
  historyState: HistoryState
}>()
</script>

<template>
  <LexicalNestedComposer :initial-editor="props.editor">
    <div class="low-level-editor-stage">
      <PlainTextPlugin>
        <template #contentEditable>
          <ContentEditableElement
            :editor="props.editor"
            class="low-level-editor-input"
            aria-label="Low-level nested editor"
          />
        </template>
        <template #placeholder>
          <p class="low-level-editor-placeholder">Type in the nested editor…</p>
        </template>
      </PlainTextPlugin>
    </div>
    <HistoryPlugin :external-history-state="props.historyState" />
  </LexicalNestedComposer>
</template>
