<script setup lang="ts">
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  createEditor,
} from 'lexical'
import type { EditorState, LexicalEditor, NodeKey } from 'lexical'
import { HashtagNode } from '@lexical/hashtag'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { CHECK_LIST, HEADING, ORDERED_LIST, QUOTE, UNORDERED_LIST } from '@lexical/markdown'
import { OverflowNode } from '@lexical/overflow'
import { $createHeadingNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { GripVertical } from '@lucide/vue'
import { ref } from 'vue'
import {
  AutoFocusPlugin,
  AutoLinkPlugin,
  CharacterLimitPlugin,
  CheckListPlugin,
  ClearEditorPlugin,
  ContentEditable,
  DraggableBlockPlugin,
  HashtagPlugin,
  HistoryPlugin,
  HorizontalRuleNode,
  HorizontalRulePlugin,
  LexicalErrorBoundary,
  LexicalComposer,
  LinkPlugin,
  ListPlugin,
  MarkdownShortcutPlugin,
  NodeContextMenuOption,
  NodeContextMenuPlugin,
  NodeContextMenuSeparator,
  NodeEventPlugin,
  OnChangePlugin,
  RichTextPlugin,
  SelectionAlwaysOnDisplay,
  TabIndentationPlugin,
  TableCellNode,
  TableCellResizer,
  TableNode,
  TableOfContentsPlugin,
  TablePlugin,
  TableRowNode,
  createEmptyHistoryState,
  createLinkMatcherWithRegExp,
} from '@gridigor/vue-lexical'
import LexicalTypeaheadPlayground from './LexicalTypeaheadPlayground.vue'

const selectedHashtag = ref('none yet')
const characterCount = ref(0)
const editorStage = ref<HTMLElement | null>(null)
const lastWarning = ref('none')
const sharedHistoryState = createEmptyHistoryState()
const nestedEditor = createEditor({
  namespace: 'NuxtLowLevelNestedExample',
  onError(error) {
    throw error
  },
  onWarn(error) {
    lastWarning.value = error.message
  },
})
nestedEditor.update(
  () => {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('This nested editor uses ContentEditableElement directly.'),
      ),
    )
  },
  { discrete: true },
)
const contextMenuItems = [
  new NodeContextMenuOption('Select all', {
    $onSelect: () => {
      const root = $getRoot()
      root.select(0, root.getChildrenSize())
    },
  }),
  new NodeContextMenuSeparator(),
  new NodeContextMenuOption('Clear editor', {
    $onSelect: () => $getRoot().clear().append($createParagraphNode()),
  }),
]
const transformers = [HEADING, QUOTE, UNORDERED_LIST, ORDERED_LIST, CHECK_LIST]
const urlMatcher = createLinkMatcherWithRegExp(/https?:\/\/[^\s<]+/i, (text) =>
  text.replace(/[.,!?;:]$/, ''),
)

const initialConfig = {
  namespace: 'NuxtExample',
  nodes: [
    AutoLinkNode,
    HashtagNode,
    HeadingNode,
    HorizontalRuleNode,
    LinkNode,
    ListItemNode,
    ListNode,
    OverflowNode,
    QuoteNode,
    TableCellNode,
    TableNode,
    TableRowNode,
  ],
  editorState: () => {
    $getRoot().append(
      $createHeadingNode('h1').append($createTextNode('Vue Lexical playground')),
      $createParagraphNode().append(
        $createTextNode(
          'Try @vu for a mention, /hea for a command, #vue for a hashtag, or “# ” for Markdown.',
        ),
      ),
      $createParagraphNode().append(
        $createTextNode('Move between blocks to reveal the drag handle on the left.'),
      ),
    )
  },
  onError(error: Error) {
    throw error
  },
  onWarn(error: Error) {
    lastWarning.value = error.message
  },
  theme: {
    hashtag: 'editor-hashtag',
    hr: 'editor-horizontal-rule',
    hrSelected: 'editor-horizontal-rule-selected',
    heading: {
      h1: 'editor-heading',
    },
    link: 'editor-link',
    list: {
      checklist: 'editor-checklist',
      listitem: 'editor-list-item',
      listitemChecked: 'editor-list-item-checked',
      listitemUnchecked: 'editor-list-item-unchecked',
      nested: {
        listitem: 'editor-nested-list-item',
      },
      ol: 'editor-list',
      ul: 'editor-list',
    },
    overflow: 'editor-overflow',
    paragraph: 'editor-paragraph',
    quote: 'editor-quote',
    table: 'editor-table',
    tableCell: 'editor-table-cell',
    tableCellHeader: 'editor-table-cell-header',
    tableCellSelected: 'editor-table-cell-selected',
    tableScrollableWrapper: 'editor-table-scroll',
    tableSelection: 'editor-table-selection',
    text: {
      bold: 'editor-text-bold',
      code: 'editor-text-code',
      italic: 'editor-text-italic',
      strikethrough: 'editor-text-strikethrough',
      underline: 'editor-text-underline',
    },
  },
}

function onHashtagClick(_event: Event, _editor: LexicalEditor, nodeKey: NodeKey) {
  selectedHashtag.value = $getNodeByKey(nodeKey)?.getTextContent() ?? 'removed'
}

function onChange(editorState: EditorState) {
  characterCount.value = editorState.read(() => $getRoot().getTextContentSize())
}
</script>

<template>
  <section class="editor-card" aria-labelledby="editor-title">
    <div class="editor-card-heading">
      <h2 id="editor-title">SSR-safe editor</h2>
      <span>{{ characterCount }} characters · last hashtag: {{ selectedHashtag }}</span>
    </div>

    <LexicalComposer :initial-config="initialConfig">
      <LexicalErrorBoundary>
        <LexicalToolbar />
        <div ref="editorStage" class="editor-stage">
          <RichTextPlugin>
            <template #contentEditable>
              <ContentEditable class="editor-input" aria-label="Rich text editor" />
            </template>
            <template #placeholder>
              <p class="editor-placeholder">Start typing…</p>
            </template>
          </RichTextPlugin>
          <TableOfContentsPlugin v-slot="{ tableOfContents, editor }">
            <nav
              v-if="tableOfContents.length"
              class="editor-table-of-contents"
              aria-label="Headings"
            >
              <strong>On this page</strong>
              <button
                v-for="[key, text, tag] in tableOfContents"
                :key="key"
                type="button"
                :class="`toc-${tag}`"
                @click="editor.getElementByKey(key)?.scrollIntoView({ block: 'center' })"
              >
                {{ text || 'Untitled heading' }}
              </button>
            </nav>
          </TableOfContentsPlugin>
        </div>
        <div class="editor-status">
          <span>Drag blocks from the left · Drag table borders to resize cells</span>
          <CharacterLimitPlugin :max-length="280">
            <template #default="{ remainingCharacters, exceeded }">
              <span :class="{ exceeded }">{{ remainingCharacters }} remaining</span>
            </template>
          </CharacterLimitPlugin>
        </div>
        <aside class="low-level-demo" aria-labelledby="low-level-editor-title">
          <div class="low-level-demo-copy">
            <p class="eyebrow">Low-level API · shared history</p>
            <h3 id="low-level-editor-title">Explicit ContentEditableElement</h3>
            <p>
              This nested editor receives its Lexical editor explicitly. Type in either editor, then
              use the shared controls to verify that both write to one HistoryState.
            </p>
            <span class="warning-status">Latest recoverable warning: {{ lastWarning }}</span>
            <LexicalSharedHistoryControls />
          </div>
          <LexicalLowLevelEditor :editor="nestedEditor" :history-state="sharedHistoryState" />
        </aside>
        <HistoryPlugin :external-history-state="sharedHistoryState" />
        <HorizontalRulePlugin />
        <TablePlugin :has-horizontal-scroll="true" />
        <TableCellResizer />
        <SelectionAlwaysOnDisplay />
        <DraggableBlockPlugin :anchor-element="editorStage">
          <template #menu>
            <button
              type="button"
              class="editor-drag-handle"
              title="Drag block"
              aria-label="Drag block"
              tabindex="-1"
            >
              <GripVertical :size="17" aria-hidden="true" />
            </button>
          </template>
          <template #targetLine>
            <div class="editor-drop-line" />
          </template>
        </DraggableBlockPlugin>
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <LinkPlugin />
        <AutoLinkPlugin :matchers="[urlMatcher]" />
        <ListPlugin :has-strict-indent="true" />
        <CheckListPlugin />
        <TabIndentationPlugin :max-indent="4" />
        <MarkdownShortcutPlugin :transformers="transformers" />
        <HashtagPlugin />
        <LexicalTypeaheadPlayground />
        <NodeContextMenuPlugin
          class-name="editor-context-menu"
          item-class-name="editor-context-menu-item"
          separator-class-name="editor-context-menu-separator"
          :items="contextMenuItems"
        />
        <OnChangePlugin @change="onChange" />
        <NodeEventPlugin
          :node-type="HashtagNode"
          event-type="click"
          :event-listener="onHashtagClick"
        />

        <template #fallback="{ error, reset }">
          <div class="editor-error" role="alert">
            <strong>{{ error.message }}</strong>
            <button type="button" @click="reset">Try again</button>
          </div>
        </template>
      </LexicalErrorBoundary>
    </LexicalComposer>
  </section>
</template>
