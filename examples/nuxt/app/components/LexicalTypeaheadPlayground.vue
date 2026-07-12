<script setup lang="ts">
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from 'lexical'
import { $insertList } from '@lexical/list'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { AtSign, Heading1, List, ListOrdered, Pilcrow, Quote } from '@lucide/vue'
import { computed, h, ref } from 'vue'
import {
  MenuOption,
  TypeaheadMenuPlugin,
  createBasicTypeaheadTriggerMatch,
} from '@gridigor/vue-lexical'

class PlaygroundOption extends MenuOption {
  constructor(
    key: string,
    title: string,
    readonly keywords: readonly string[],
    readonly select: () => void,
    icon: MenuOption['icon'],
  ) {
    super(key)
    this.title = title
    this.icon = icon
  }
}

const mentionQuery = ref<string | null>(null)
const commandQuery = ref<string | null>(null)
const mentionTrigger = createBasicTypeaheadTriggerMatch('@', { minLength: 0 })
const commandTrigger = createBasicTypeaheadTriggerMatch('/', { minLength: 0 })

const mentions = ['Vue', 'Nuxt', 'Lexical'].map((label) => {
  const option = new MenuOption(label.toLowerCase())
  option.title = label
  option.icon = h(AtSign, { 'aria-hidden': true, size: 16 })
  return option
})

const commands = [
  new PlaygroundOption(
    'paragraph',
    'Paragraph',
    ['paragraph', 'text'],
    () => setBlock('paragraph'),
    h(Pilcrow, { 'aria-hidden': true, size: 16 }),
  ),
  new PlaygroundOption(
    'heading-1',
    'Heading 1',
    ['heading', 'title', 'h1'],
    () => setBlock('heading'),
    h(Heading1, { 'aria-hidden': true, size: 16 }),
  ),
  new PlaygroundOption(
    'quote',
    'Quote',
    ['quote', 'blockquote'],
    () => setBlock('quote'),
    h(Quote, { 'aria-hidden': true, size: 16 }),
  ),
  new PlaygroundOption(
    'bullet-list',
    'Bulleted list',
    ['bullet', 'unordered', 'list'],
    () => $insertList('bullet'),
    h(List, { 'aria-hidden': true, size: 16 }),
  ),
  new PlaygroundOption(
    'number-list',
    'Numbered list',
    ['number', 'ordered', 'list'],
    () => $insertList('number'),
    h(ListOrdered, { 'aria-hidden': true, size: 16 }),
  ),
]

const mentionOptions = computed(() => filterOptions(mentions, mentionQuery.value))
const commandOptions = computed(() => filterOptions(commands, commandQuery.value))

function filterOptions<TOption extends MenuOption>(
  options: readonly TOption[],
  query: string | null,
) {
  const normalizedQuery = query?.trim().toLowerCase() ?? ''
  if (normalizedQuery === '') return options

  return options.filter((option) => {
    const title = typeof option.title === 'string' ? option.title : ''
    const keywords = option instanceof PlaygroundOption ? option.keywords : []
    return [title, ...keywords].some((value) => value.toLowerCase().includes(normalizedQuery))
  })
}

function setBlock(type: 'paragraph' | 'heading' | 'quote') {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return

  $setBlocksType(selection, () => {
    if (type === 'heading') return $createHeadingNode('h1')
    if (type === 'quote') return $createQuoteNode()
    return $createParagraphNode()
  })
}

function selectMention(option: MenuOption, queryNode: TextNode | null, closeMenu: () => void) {
  if (queryNode !== null) {
    const mention = $createTextNode(`@${String(option.title)} `)
    queryNode.replace(mention)
    mention.selectEnd()
  }
  closeMenu()
}

function selectCommand(option: MenuOption, queryNode: TextNode | null, closeMenu: () => void) {
  if (option instanceof PlaygroundOption) {
    option.select()
    queryNode?.remove()
  }
  closeMenu()
}
</script>

<template>
  <TypeaheadMenuPlugin
    anchor-class-name="editor-typeahead-anchor"
    :options="mentionOptions"
    :trigger-fn="mentionTrigger"
    :on-query-change="(query) => (mentionQuery = query)"
    :on-select-option="selectMention"
  />
  <TypeaheadMenuPlugin
    anchor-class-name="editor-typeahead-anchor"
    :options="commandOptions"
    :trigger-fn="commandTrigger"
    :on-query-change="(query) => (commandQuery = query)"
    :on-select-option="selectCommand"
  />
</template>
