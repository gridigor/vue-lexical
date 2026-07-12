import type { Klass, LexicalEditor, LexicalNode } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  $isTextNode,
  KEY_ENTER_COMMAND,
} from 'lexical'
import { $isHorizontalRuleNode, HorizontalRuleNode } from '@lexical/extension'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  type Transformer,
} from '@lexical/markdown'
import { $isHeadingNode, HeadingNode } from '@lexical/rich-text'
import { mount } from '@vue/test-utils'
import { h, nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import {
  DEFAULT_TRANSFORMERS,
  LexicalMarkdownShortcutPlugin,
} from '../src/LexicalMarkdownShortcutPlugin'

const onError = (error: Error) => {
  throw error
}

function mountMarkdownEditor(options: {
  nodes: Array<Klass<LexicalNode>>
  text: string
  transformers: Transformer[]
}) {
  const editorRef = shallowRef<LexicalEditor | null>()
  const wrapper = mount(LexicalComposer, {
    props: {
      initialConfig: {
        editorState: () => {
          const text = $createTextNode(options.text)
          $getRoot().append($createParagraphNode().append(text))
          text.selectEnd()
        },
        namespace: 'markdown-shortcuts-integration',
        nodes: options.nodes,
        onError,
      },
    },
    slots: {
      default: () => [
        h(EditorRefPlugin, { editorRef }),
        h(LexicalMarkdownShortcutPlugin, { transformers: options.transformers }),
      ],
    },
  })

  return { editorRef, wrapper }
}

async function updateEditor(editor: LexicalEditor, update: () => void) {
  await new Promise<void>((resolve) => editor.update(update, { onUpdate: resolve }))
  await nextTick()
}

describe('MarkdownShortcutPlugin integration', () => {
  it('converts a typed heading shortcut and unregisters on unmount', async () => {
    const { editorRef, wrapper } = mountMarkdownEditor({
      nodes: [HeadingNode],
      text: '#',
      transformers: [HEADING],
    })
    await nextTick()
    const editor = editorRef.value!

    await updateEditor(editor, () => {
      const text = $getRoot().getFirstDescendant()
      if (!$isTextNode(text)) {
        throw new Error('Expected Markdown source text')
      }
      text.selectEnd().insertText(' ')
    })

    expect(
      editor.getEditorState().read(() => {
        const heading = $getRoot().getFirstChildOrThrow()
        return $isHeadingNode(heading) ? heading.getTag() : null
      }),
    ).toBe('h1')

    wrapper.unmount()
    await updateEditor(editor, () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('# ')))
    })
    expect(editor.getEditorState().read(() => $isParagraphNode($getRoot().getFirstChild()))).toBe(
      true,
    )
  })

  it('converts, imports, and exports horizontal rules', async () => {
    const horizontalRuleTransformer = DEFAULT_TRANSFORMERS[0]!
    const { editorRef, wrapper } = mountMarkdownEditor({
      nodes: [HorizontalRuleNode],
      text: '---',
      transformers: [horizontalRuleTransformer],
    })
    await nextTick()
    const editor = editorRef.value!

    expect(editor.dispatchCommand(KEY_ENTER_COMMAND, new KeyboardEvent('keydown'))).toBe(true)
    await nextTick()
    expect(
      editor.getEditorState().read(() => $isHorizontalRuleNode($getRoot().getFirstChild())),
    ).toBe(true)
    expect(
      editor.getEditorState().read(() => $convertToMarkdownString([horizontalRuleTransformer])),
    ).toContain('***')

    await updateEditor(editor, () => {
      $convertFromMarkdownString('___', [horizontalRuleTransformer])
    })
    expect(
      editor.getEditorState().read(() => $isHorizontalRuleNode($getRoot().getFirstChild())),
    ).toBe(true)

    wrapper.unmount()
  })
})
