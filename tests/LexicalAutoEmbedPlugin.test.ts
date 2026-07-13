import { $createAutoLinkNode, AutoLinkNode, LinkNode } from '@lexical/link'
import { mount } from '@vue/test-utils'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  PASTE_TAG,
  type LexicalEditor,
} from 'lexical'
import type { PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AutoEmbedOption,
  AutoEmbedPlugin,
  type AutoEmbedPluginProps,
  type EmbedConfig,
  INSERT_EMBED_COMMAND,
  URL_MATCHER,
} from '../src/LexicalAutoEmbedPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalContentEditable } from '../src/LexicalContentEditable'
import { EditorRefPlugin } from '../src/LexicalEditorRefPlugin'
import type { MenuSlotProps } from '../src/LexicalNodeMenuPlugin'

const onError = (error: Error) => {
  throw error
}

let latestSlotProps: MenuSlotProps<AutoEmbedOption> | null = null

const TestEditor = defineComponent({
  props: {
    embedConfigs: {
      type: Array as PropType<EmbedConfig[]>,
      required: true,
    },
    getMenuOptions: {
      type: Function as PropType<AutoEmbedPluginProps['getMenuOptions']>,
      required: true,
    },
    onOpenEmbedModalForConfig: Function as PropType<
      NonNullable<AutoEmbedPluginProps['onOpenEmbedModalForConfig']>
    >,
  },
  setup() {
    let editor: LexicalEditor | null = null
    return {
      getEditor: () => editor,
      setEditor: (value: LexicalEditor | null) => {
        editor = value
      },
    }
  },
  render() {
    return h(
      LexicalComposer,
      {
        initialConfig: {
          namespace: 'auto-embed',
          nodes: [LinkNode, AutoLinkNode],
          onError,
        },
      },
      {
        default: () => [
          h(LexicalContentEditable, { 'aria-label': 'Editor' }),
          h(EditorRefPlugin, { editorRef: this.setEditor }),
          h(
            AutoEmbedPlugin,
            {
              embedConfigs: this.embedConfigs,
              getMenuOptions: this.getMenuOptions,
              onOpenEmbedModalForConfig: this.onOpenEmbedModalForConfig,
            },
            {
              default: (slotProps: MenuSlotProps<AutoEmbedOption>) => {
                latestSlotProps = slotProps
                return h('button', { class: 'embed-option' }, slotProps.options[0]?.title)
              },
            },
          ),
        ],
      },
    )
  },
})

async function mountAutoEmbed(overrides: Record<string, unknown> = {}) {
  const config: EmbedConfig = {
    insertNode: vi.fn(),
    parseUrl: vi.fn((url: string) => ({ id: 'video', url })),
    type: 'video',
  }
  const getMenuOptions = vi.fn(
    (_activeConfig: EmbedConfig, embed: () => void, _dismiss: () => void) => [
      new AutoEmbedOption('Embed video', { onSelect: embed }),
    ],
  )
  const wrapper = mount(TestEditor, {
    attachTo: document.body,
    props: {
      embedConfigs: [config],
      getMenuOptions,
      ...overrides,
    },
  })
  await nextTick()
  const editor = wrapper.vm.getEditor()
  if (editor === null) throw new Error('Expected editor')
  return { config, editor, getMenuOptions, wrapper }
}

async function pasteLink(editor: LexicalEditor, url = 'https://example.com/video') {
  await new Promise<void>((resolve) =>
    editor.update(
      () => {
        const link = $createAutoLinkNode(url).append($createTextNode(url))
        $getRoot().append($createParagraphNode().append(link))
      },
      { onUpdate: resolve, tag: PASTE_TAG },
    ),
  )
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

async function clearEditor(editor: LexicalEditor) {
  await new Promise<void>((resolve) =>
    editor.update(() => $getRoot().clear(), { onUpdate: resolve }),
  )
  await nextTick()
}

beforeEach(() => {
  latestSlotProps = null
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
    },
  )
})

describe('AutoEmbedOption', () => {
  it('binds selection callbacks and exports a URL matcher', () => {
    const receiver = {
      called: false,
      select() {
        this.called = true
      },
    }
    const option = new AutoEmbedOption('Embed', { onSelect: receiver.select })
    option.onSelect(null)
    expect(option.title).toBe('Embed')
    expect(receiver.called).toBe(false)
    expect(URL_MATCHER.test('https://example.com/watch?v=1')).toBe(true)
    expect(URL_MATCHER.test('not a url')).toBe(false)
  })
})

describe('AutoEmbedPlugin', () => {
  it('handles the insert command when a modal callback is provided', async () => {
    const onOpen = vi.fn()
    const { config, editor, wrapper } = await mountAutoEmbed({
      onOpenEmbedModalForConfig: onOpen,
    })
    expect(editor.dispatchCommand(INSERT_EMBED_COMMAND, 'missing')).toBe(false)
    expect(editor.dispatchCommand(INSERT_EMBED_COMMAND, 'video')).toBe(true)
    expect(onOpen).toHaveBeenCalledWith(config)
    wrapper.unmount()
  })

  it('detects pasted auto links and embeds the selected URL', async () => {
    const { config, editor, getMenuOptions, wrapper } = await mountAutoEmbed()
    await pasteLink(editor)

    expect(getMenuOptions).toHaveBeenCalledWith(config, expect.any(Function), expect.any(Function))
    expect(document.querySelector('.embed-option')?.textContent).toBe('Embed video')
    const option = latestSlotProps?.options[0]
    if (option === undefined) throw new Error('Expected embed option')
    latestSlotProps?.selectOptionAndCleanUp(option)
    await Promise.resolve()
    await nextTick()

    expect(config.insertNode).toHaveBeenCalledWith(editor, {
      id: 'video',
      url: 'https://example.com/video',
    })
    expect(editor.getRootElement()?.querySelector('a')).toBeNull()
    wrapper.unmount()
  })

  it('checks every config and lets menu options dismiss the suggestion', async () => {
    const dismissHolder: { dismiss?: () => void } = {}
    const first: EmbedConfig = {
      insertNode: vi.fn(),
      parseUrl: vi.fn(() => null),
      type: 'first',
    }
    const second: EmbedConfig = {
      insertNode: vi.fn(),
      parseUrl: vi.fn((url: string) => ({ id: 'second', url })),
      type: 'second',
    }
    const getMenuOptions = vi.fn(
      (_config: EmbedConfig, _embed: () => void, dismiss: () => void) => {
        dismissHolder.dismiss = dismiss
        return [new AutoEmbedOption('Embed second', { onSelect: vi.fn() })]
      },
    )
    const { editor, wrapper } = await mountAutoEmbed({
      embedConfigs: [first, second],
      getMenuOptions,
    })
    await pasteLink(editor)
    expect(getMenuOptions).toHaveBeenCalledWith(second, expect.any(Function), expect.any(Function))
    dismissHolder.dismiss?.()
    await nextTick()
    expect(document.querySelector('.embed-option')).toBeNull()
    wrapper.unmount()
  })

  it('ignores unmatched, stale, and removed links', async () => {
    let resolveMatch: ((value: { id: string; url: string } | null) => void) | undefined
    const parseUrl = vi.fn(
      (_url: string) =>
        new Promise<{ id: string; url: string } | null>((resolve) => {
          resolveMatch = resolve
        }),
    )
    const config: EmbedConfig = { insertNode: vi.fn(), parseUrl, type: 'async' }
    const { editor, wrapper } = await mountAutoEmbed({ embedConfigs: [config] })
    await pasteLink(editor)
    await clearEditor(editor)
    resolveMatch?.({ id: 'late', url: 'https://example.com/video' })
    await Promise.resolve()
    await nextTick()
    expect(document.querySelector('.embed-option')).toBeNull()
    wrapper.unmount()

    const unmatched = await mountAutoEmbed({
      embedConfigs: [{ ...config, parseUrl: () => null }],
    })
    await pasteLink(unmatched.editor)
    expect(document.querySelector('.embed-option')).toBeNull()
    unmatched.wrapper.unmount()
  })

  it('does not embed when the target disappears or no longer parses', async () => {
    const { config, editor, getMenuOptions, wrapper } = await mountAutoEmbed()
    await pasteLink(editor)
    const embed = getMenuOptions.mock.calls[0]?.[1]
    await clearEditor(editor)
    await embed?.()
    expect(config.insertNode).not.toHaveBeenCalled()
    wrapper.unmount()

    const nullConfig: EmbedConfig = {
      insertNode: vi.fn(),
      parseUrl: vi
        .fn()
        .mockReturnValueOnce({ id: 'initial', url: 'https://example.com/video' })
        .mockReturnValue(null),
      type: 'null',
    }
    const second = await mountAutoEmbed({ embedConfigs: [nullConfig] })
    await pasteLink(second.editor)
    const nullEmbed = second.getMenuOptions.mock.calls[0]?.[1]
    await nullEmbed?.()
    expect(nullConfig.insertNode).not.toHaveBeenCalled()
    second.wrapper.unmount()
  })

  it('does not insert after an asynchronously parsed target is removed', async () => {
    let resolveEmbed: ((value: { id: string; url: string }) => void) | undefined
    const parseUrl = vi
      .fn()
      .mockReturnValueOnce({ id: 'initial', url: 'https://example.com/video' })
      .mockImplementationOnce(
        (_url: string) =>
          new Promise<{ id: string; url: string }>((resolve) => {
            resolveEmbed = resolve
          }),
      )
    const config: EmbedConfig = { insertNode: vi.fn(), parseUrl, type: 'race' }
    const { editor, getMenuOptions, wrapper } = await mountAutoEmbed({ embedConfigs: [config] })
    await pasteLink(editor)
    const embedPromise = getMenuOptions.mock.calls[0]?.[1]?.()
    await clearEditor(editor)
    resolveEmbed?.({ id: 'late', url: 'https://example.com/video' })
    await embedPromise
    await nextTick()
    expect(config.insertNode).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
