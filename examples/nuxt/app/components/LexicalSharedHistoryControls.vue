<script setup lang="ts">
import { REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import { Redo2, Undo2 } from '@lucide/vue'
import { useLexicalComposer } from '@gridigor/vue-lexical'

const editor = useLexicalComposer()
</script>

<template>
  <div class="shared-history-controls" role="group" aria-label="Shared history controls">
    <button
      type="button"
      title="Undo the latest change from either editor"
      @mousedown.prevent
      @click="editor.dispatchCommand(UNDO_COMMAND, undefined)"
    >
      <Undo2 :size="14" aria-hidden="true" />
      Shared undo
    </button>
    <button
      type="button"
      title="Redo the latest shared-history change"
      @mousedown.prevent
      @click="editor.dispatchCommand(REDO_COMMAND, undefined)"
    >
      <Redo2 :size="14" aria-hidden="true" />
      Shared redo
    </button>
  </div>
</template>
