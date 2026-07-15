<script setup lang="ts">
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/extension'
import { HistoryExtension } from '@lexical/history'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $createHeadingNode, $createQuoteNode, $isHeadingNode } from '@lexical/rich-text'
import { $setBlocksType } from '@lexical/selection'
import {
  Bold,
  CheckSquare,
  Code2,
  CircleHelp,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
} from '@lucide/vue'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CLEAR_EDITOR_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type TextFormatType,
} from 'lexical'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  useExtensionSignalValue,
  useLexicalAriaLiveRegion,
  useLexicalComposer,
  useLexicalFocusManagerRef,
  useLexicalFocusTrapRef,
  useLexicalRovingTabIndexRef,
  type LexicalElementRef,
} from '@gridigor/vue-lexical'

const editor = useLexicalComposer()
const canUndo = useExtensionSignalValue(HistoryExtension, 'canUndo')
const canRedo = useExtensionSignalValue(HistoryExtension, 'canRedo')
const announce = useLexicalAriaLiveRegion()
const focusManagerRef = useLexicalFocusManagerRef({
  toolbarItemSelector: 'button:not([disabled])',
})
const rovingTabIndexRef = useLexicalRovingTabIndexRef({
  itemSelector: 'button:not([disabled])',
  orientation: 'horizontal',
})
const toolbarRef: LexicalElementRef = (element) => {
  focusManagerRef(element)
  rovingTabIndexRef(element)
}
const helpOpen = ref(false)
const focusTrapRef = useLexicalFocusTrapRef(helpOpen)
const lastAnnouncement = ref('Use a formatting button to create an announcement.')
const blockType = ref('paragraph')
const formats = reactive<Record<TextFormatType, boolean>>({
  bold: false,
  capitalize: false,
  code: false,
  highlight: false,
  italic: false,
  lowercase: false,
  strikethrough: false,
  subscript: false,
  superscript: false,
  underline: false,
  uppercase: false,
})
let unregisterUpdate: (() => void) | undefined

function readToolbarState(): void {
  editor.getEditorState().read(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) {
      return
    }

    for (const format of Object.keys(formats) as TextFormatType[]) {
      formats[format] = selection.hasFormat(format)
    }

    const anchorNode = selection.anchor.getNode()
    const topLevelElement =
      anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
    blockType.value = $isHeadingNode(topLevelElement)
      ? topLevelElement.getTag()
      : topLevelElement.getType()
  })
}

onMounted(() => {
  readToolbarState()
  unregisterUpdate = editor.registerUpdateListener(readToolbarState)
})

onUnmounted(() => unregisterUpdate?.())

function formatText(format: TextFormatType): void {
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)
}

function formatParagraph(): void {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createParagraphNode())
    }
  })
}

function formatHeading(tag: 'h1' | 'h2'): void {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createHeadingNode(tag))
    }
  })
}

function formatQuote(): void {
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createQuoteNode())
    }
  })
}

function toggleLink(): void {
  const url = window.prompt('Link URL', 'https://')
  if (url !== null) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url === '' ? null : url)
  }
}

function announceToolbarAction(event: MouseEvent): void {
  const target = event.target
  const button = target instanceof Element ? target.closest<HTMLButtonElement>('button') : null
  const label = button?.getAttribute('aria-label')
  if (label !== null && label !== undefined && button?.disabled === false) {
    const message = `${label} activated`
    lastAnnouncement.value = message
    announce(message)
  }
}

function openKeyboardHelp(): void {
  helpOpen.value = true
}

function closeKeyboardHelp(): void {
  helpOpen.value = false
  const message = 'Keyboard help closed'
  lastAnnouncement.value = message
  announce(message)
}
</script>

<template>
  <nav
    :ref="toolbarRef"
    class="editor-toolbar"
    aria-label="Editor formatting"
    role="toolbar"
    @click="announceToolbarAction"
  >
    <div class="toolbar-group" aria-label="History">
      <button
        type="button"
        title="Undo"
        aria-label="Undo"
        :disabled="!canUndo"
        @click="editor.dispatchCommand(UNDO_COMMAND, undefined)"
      >
        <Undo2 :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Redo"
        aria-label="Redo"
        :disabled="!canRedo"
        @click="editor.dispatchCommand(REDO_COMMAND, undefined)"
      >
        <Redo2 :size="17" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group" aria-label="Blocks">
      <button
        type="button"
        title="Paragraph"
        aria-label="Paragraph"
        :class="{ active: blockType === 'paragraph' }"
        @click="formatParagraph"
      >
        <Pilcrow :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Heading 1"
        aria-label="Heading 1"
        :class="{ active: blockType === 'h1' }"
        @click="formatHeading('h1')"
      >
        <Heading1 :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Heading 2"
        aria-label="Heading 2"
        :class="{ active: blockType === 'h2' }"
        @click="formatHeading('h2')"
      >
        <Heading2 :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Quote"
        aria-label="Quote"
        :class="{ active: blockType === 'quote' }"
        @click="formatQuote"
      >
        <Quote :size="17" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group" aria-label="Text formatting">
      <button
        type="button"
        title="Bold"
        aria-label="Bold"
        :class="{ active: formats.bold }"
        @click="formatText('bold')"
      >
        <Bold :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Italic"
        aria-label="Italic"
        :class="{ active: formats.italic }"
        @click="formatText('italic')"
      >
        <Italic :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Underline"
        aria-label="Underline"
        :class="{ active: formats.underline }"
        @click="formatText('underline')"
      >
        <Underline :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Strikethrough"
        aria-label="Strikethrough"
        :class="{ active: formats.strikethrough }"
        @click="formatText('strikethrough')"
      >
        <Strikethrough :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Code"
        aria-label="Code"
        :class="{ active: formats.code }"
        @click="formatText('code')"
      >
        <Code2 :size="17" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group" aria-label="Lists">
      <button
        type="button"
        title="Bullet list"
        aria-label="Bullet list"
        @click="editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)"
      >
        <List :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Numbered list"
        aria-label="Numbered list"
        @click="editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)"
      >
        <ListOrdered :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Checklist"
        aria-label="Checklist"
        @click="editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)"
      >
        <CheckSquare :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Remove list"
        aria-label="Remove list"
        @click="editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)"
      >
        <RemoveFormatting :size="17" aria-hidden="true" />
      </button>
    </div>

    <div class="toolbar-group toolbar-group-end" aria-label="Insert and clear">
      <button type="button" title="Add link" aria-label="Add link" @click="toggleLink">
        <Link :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Remove link"
        aria-label="Remove link"
        @click="editor.dispatchCommand(TOGGLE_LINK_COMMAND, null)"
      >
        <Unlink :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Horizontal rule"
        aria-label="Horizontal rule"
        @click="editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)"
      >
        <Minus :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Clear editor"
        aria-label="Clear editor"
        @click="editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)"
      >
        <RemoveFormatting :size="17" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Keyboard help"
        aria-label="Keyboard help"
        @click="openKeyboardHelp"
      >
        <CircleHelp :size="17" aria-hidden="true" />
      </button>
    </div>
  </nav>

  <div class="a11y-demo-guide">
    <p>
      Keyboard test: focus the editor, press <kbd>Alt</kbd> + <kbd>F10</kbd>, move through the
      toolbar with <kbd>←</kbd>/<kbd>→</kbd>, then press <kbd>Escape</kbd> to return.
    </p>
    <p aria-hidden="true"><strong>Live-region mirror:</strong> {{ lastAnnouncement }}</p>
  </div>

  <div v-if="helpOpen" class="dialog-backdrop" @click.self="closeKeyboardHelp">
    <section
      :ref="focusTrapRef"
      class="keyboard-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-dialog-title"
      tabindex="-1"
      @keydown.esc.stop.prevent="closeKeyboardHelp"
    >
      <span class="editor-kicker">Focus trap demo</span>
      <h3 id="keyboard-dialog-title">Keyboard navigation</h3>
      <p>
        Tab and Shift+Tab remain inside this dialog. Escape closes it and restores focus to the
        toolbar button that opened it.
      </p>
      <a href="https://lexical.dev" target="_blank" rel="noreferrer">Lexical documentation</a>
      <button type="button" @click="closeKeyboardHelp">Close dialog</button>
    </section>
  </div>
</template>
