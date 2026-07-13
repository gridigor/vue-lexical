<script setup lang="ts">
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot } from 'lexical'
import type { EditorState, LexicalEditor, NodeKey } from 'lexical'
import { HashtagNode } from '@lexical/hashtag'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { CHECK_LIST, HEADING, ORDERED_LIST, QUOTE, UNORDERED_LIST } from '@lexical/markdown'
import { OverflowNode } from '@lexical/overflow'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
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
  createLinkMatcherWithRegExp,
} from '@gridigor/vue-lexical'
import LexicalTypeaheadPlayground from './LexicalTypeaheadPlayground.vue'

const selectedHashtag = ref('none yet')
const characterCount = ref(0)
const editorStage = ref<HTMLElement | null>(null)
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
  ],
  editorState: () => {
    $getRoot().append(
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
        </div>
        <div class="editor-status">
          <span>Hover a text block, then drag the handle on its left · Minus inserts a rule</span>
          <CharacterLimitPlugin :max-length="280">
            <template #default="{ remainingCharacters, exceeded }">
              <span :class="{ exceeded }">{{ remainingCharacters }} remaining</span>
            </template>
          </CharacterLimitPlugin>
        </div>
        <HistoryPlugin />
        <HorizontalRulePlugin />
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
