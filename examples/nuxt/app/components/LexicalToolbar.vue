<script setup lang="ts">
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  mergeRegister,
} from 'lexical'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode } from '@lexical/rich-text'
import {
  Bold,
  Code,
  Heading1,
  Italic,
  Link as LinkIcon,
  List as ListIcon,
  ListChecks,
  ListOrdered,
  ListX,
  Lock,
  LockOpen,
  Minus,
  Pilcrow,
  Redo2,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Unlink,
} from '@lucide/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import {
  INSERT_HORIZONTAL_RULE_COMMAND,
  INSERT_TABLE_COMMAND,
  useLexicalComposer,
  useLexicalEditable,
} from '@gridigor/vue-lexical'

const editor = useLexicalComposer()
const editable = useLexicalEditable()
const canUndo = ref(false)
const canRedo = ref(false)
let unregister: (() => void) | undefined

onMounted(() => {
  unregister = mergeRegister(
    editor.registerCommand(
      CAN_UNDO_COMMAND,
      (value) => {
        canUndo.value = value
        return false
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      CAN_REDO_COMMAND,
      (value) => {
        canRedo.value = value
        return false
      },
      COMMAND_PRIORITY_LOW,
    ),
  )
})
onUnmounted(() => unregister?.())

function setBlock(type: 'paragraph' | 'h1') {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () =>
        type === 'h1' ? $createHeadingNode('h1') : $createParagraphNode(),
      )
    }
  })
}

function setLink() {
  const url = window.prompt('Link URL', 'https://')
  if (url !== null) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() || null)
  }
}
</script>

<template>
  <div class="editor-toolbar-actions" role="toolbar" aria-label="Editor formatting">
    <div class="toolbar-group">
      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        :disabled="!canUndo"
        @click="editor.dispatchCommand(UNDO_COMMAND, undefined)"
      >
        <Undo2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        :disabled="!canRedo"
        @click="editor.dispatchCommand(REDO_COMMAND, undefined)"
      >
        <Redo2 :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group">
      <button
        type="button"
        title="Paragraph"
        aria-label="Paragraph"
        @mousedown.prevent
        @click="setBlock('paragraph')"
      >
        <Pilcrow :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Heading 1"
        aria-label="Heading 1"
        @mousedown.prevent
        @click="setBlock('h1')"
      >
        <Heading1 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Horizontal rule"
        aria-label="Horizontal rule"
        @mousedown.prevent
        @click="editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)"
      >
        <Minus :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Insert 3 × 3 table"
        aria-label="Insert 3 by 3 table"
        @mousedown.prevent
        @click="
          editor.dispatchCommand(INSERT_TABLE_COMMAND, {
            columns: '3',
            includeHeaders: true,
            rows: '3',
          })
        "
      >
        <Table2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Bold"
        aria-label="Bold"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')"
      >
        <Bold :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Italic"
        aria-label="Italic"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')"
      >
        <Italic :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Underline"
        aria-label="Underline"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')"
      >
        <Underline :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Strikethrough"
        aria-label="Strikethrough"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')"
      >
        <Strikethrough :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Inline code"
        aria-label="Inline code"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')"
      >
        <Code :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group">
      <button
        type="button"
        title="Bulleted list"
        aria-label="Bulleted list"
        @mousedown.prevent
        @click="editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)"
      >
        <ListIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Numbered list"
        aria-label="Numbered list"
        @mousedown.prevent
        @click="editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)"
      >
        <ListOrdered :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Checklist"
        aria-label="Checklist"
        @mousedown.prevent
        @click="editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)"
      >
        <ListChecks :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Remove list"
        aria-label="Remove list"
        @mousedown.prevent
        @click="editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)"
      >
        <ListX :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group">
      <button
        type="button"
        title="Add link"
        aria-label="Add link"
        @mousedown.prevent
        @click="setLink"
      >
        <LinkIcon :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Remove link"
        aria-label="Remove link"
        @mousedown.prevent
        @click="editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)"
      >
        <Unlink :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Align left"
        aria-label="Align left"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')"
      >
        <TextAlignStart :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Align center"
        aria-label="Align center"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')"
      >
        <TextAlignCenter :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Align right"
        aria-label="Align right"
        @mousedown.prevent
        @click="editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')"
      >
        <TextAlignEnd :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group toolbar-group-end">
      <button
        type="button"
        title="Clear editor"
        aria-label="Clear editor"
        @click="editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)"
      >
        <Trash2 :size="16" aria-hidden="true" />
      </button>
      <button
        type="button"
        :title="editable ? 'Lock editor' : 'Unlock editor'"
        :aria-label="editable ? 'Lock editor' : 'Unlock editor'"
        :class="{ active: !editable }"
        @click="editor.setEditable(!editable)"
      >
        <Lock v-if="editable" :size="16" aria-hidden="true" />
        <LockOpen v-else :size="16" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
