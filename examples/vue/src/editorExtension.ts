import {
  AutoFocusExtension,
  ClearEditorExtension,
  HorizontalRuleExtension,
  signal,
  TabIndentationExtension,
} from '@lexical/extension'
import { HashtagExtension } from '@lexical/hashtag'
import { HistoryExtension } from '@lexical/history'
import { LinkExtension } from '@lexical/link'
import { CheckListExtension, ListExtension } from '@lexical/list'
import { $createHeadingNode, RichTextExtension } from '@lexical/rich-text'
import { TreeViewExtension, useSignalValue, VueExtension } from '@gridigor/vue-lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
  defineExtension,
} from 'lexical'
import { defineComponent, h } from 'vue'

export const CharacterCountExtension = defineExtension({
  build() {
    const characterCount = signal(0)
    const Component = defineComponent({
      name: 'CharacterCountExtensionComponent',
      setup() {
        const count = useSignalValue(characterCount)
        return () =>
          h('div', { class: 'editor-status' }, [
            h('span', 'Reactive extension signal'),
            h('strong', `${count.value} characters`),
          ])
      },
    })
    return { characterCount, Component }
  },
  dependencies: [VueExtension],
  name: 'example/CharacterCount',
  register(editor, _config, state) {
    const { characterCount } = state.getOutput()
    return editor.registerTextContentListener((text) => {
      characterCount.value = text.length
    })
  },
})

export const PlaygroundExtension = defineExtension({
  $initialEditorState: () => {
    $getRoot().append(
      $createHeadingNode('h1').append($createTextNode('Built with Lexical extensions')),
      $createParagraphNode().append(
        $createTextNode(
          'Use the toolbar, create #hashtags, add links and lists, then inspect the tree below.',
        ),
      ),
    )
  },
  dependencies: [
    AutoFocusExtension,
    ClearEditorExtension,
    RichTextExtension,
    configExtension(HistoryExtension, { disabled: false }),
    LinkExtension,
    ListExtension,
    CheckListExtension,
    HashtagExtension,
    HorizontalRuleExtension,
    configExtension(TabIndentationExtension, { maxIndent: 4 }),
    CharacterCountExtension,
    TreeViewExtension,
  ],
  name: 'example/Playground',
  namespace: 'VueLexicalExtensionPlayground',
  onError(error) {
    throw error
  },
  theme: {
    hashtag: 'editor-hashtag',
    heading: {
      h1: 'editor-h1',
      h2: 'editor-h2',
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
})
