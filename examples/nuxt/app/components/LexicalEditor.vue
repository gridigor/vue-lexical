<script setup lang="ts">
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot } from 'lexical'
import type { EditorState, LexicalEditor, NodeKey } from 'lexical'
import { HashtagNode } from '@lexical/hashtag'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { CHECK_LIST, HEADING, ORDERED_LIST, QUOTE, UNORDERED_LIST } from '@lexical/markdown'
import { OverflowNode } from '@lexical/overflow'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { ref } from 'vue'
import {
  AutoFocusPlugin,
  AutoLinkPlugin,
  CharacterLimitPlugin,
  CheckListPlugin,
  ClearEditorPlugin,
  ContentEditable,
  HashtagPlugin,
  HistoryPlugin,
  LexicalErrorBoundary,
  LexicalComposer,
  LinkPlugin,
  ListPlugin,
  MarkdownShortcutPlugin,
  NodeEventPlugin,
  OnChangePlugin,
  RichTextPlugin,
  TabIndentationPlugin,
  createLinkMatcherWithRegExp,
} from '@gridigor/vue-lexical'

const selectedHashtag = ref('none yet')
const characterCount = ref(0)
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
    LinkNode,
    ListItemNode,
    ListNode,
    OverflowNode,
    QuoteNode,
  ],
  editorState: () => {
    $getRoot().append(
      $createParagraphNode().append(
        $createTextNode('Try typing #vue, start a line with “# ”, or click a hashtag.'),
      ),
    )
  },
  onError(error: Error) {
    throw error
  },
  theme: {
    hashtag: 'editor-hashtag',
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
        <div class="editor-stage">
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
          <span>Markdown: # heading, &gt; quote, -, 1., []</span>
          <CharacterLimitPlugin :max-length="280">
            <template #default="{ remainingCharacters, exceeded }">
              <span :class="{ exceeded }">{{ remainingCharacters }} remaining</span>
            </template>
          </CharacterLimitPlugin>
        </div>
        <HistoryPlugin />
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <LinkPlugin />
        <AutoLinkPlugin :matchers="[urlMatcher]" />
        <ListPlugin :has-strict-indent="true" />
        <CheckListPlugin />
        <TabIndentationPlugin :max-indent="4" />
        <MarkdownShortcutPlugin :transformers="transformers" />
        <HashtagPlugin />
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
