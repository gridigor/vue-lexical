import { $createAutoLinkNode, AutoLinkNode, LinkNode } from '@lexical/link'
import { mount } from '@vue/test-utils'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $setSelection,
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
    disableMenuFor: Function as PropType<NonNullable<AutoEmbedPluginProps['disableMenuFor']>>,
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
              disableMenuFor: this.disableMenuFor,

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

  it('prefers the last matching config and lets menu options dismiss the suggestion', async () => {
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
    expect(first.parseUrl).not.toHaveBeenCalled()
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

  it('does not embed when the target disappears before the menu is used', async () => {
    const { config, editor, getMenuOptions, wrapper } = await mountAutoEmbed()
    await pasteLink(editor)
    const embed = getMenuOptions.mock.calls[0]?.[1]
    await clearEditor(editor)
    embed?.()
    expect(config.insertNode).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('embeds the match captured when the menu opened without parsing again', async () => {
    const parseUrl = vi
      .fn()
      .mockReturnValueOnce({ id: 'captured', url: 'https://example.com/video' })
      .mockReturnValue(null)
    const config: EmbedConfig = { insertNode: vi.fn(), parseUrl, type: 'captured' }
    const { editor, getMenuOptions, wrapper } = await mountAutoEmbed({ embedConfigs: [config] })
    await pasteLink(editor)

    getMenuOptions.mock.calls[0]?.[1]?.()
    await nextTick()

    expect(parseUrl).toHaveBeenCalledTimes(1)
    expect(config.insertNode).toHaveBeenCalledWith(editor, {
      id: 'captured',
      url: 'https://example.com/video',
    })
    wrapper.unmount()
  })

  it('selects the link when the editor has no selection', async () => {
    const { config, editor, getMenuOptions, wrapper } = await mountAutoEmbed()
    await pasteLink(editor)

    await new Promise<void>((resolve) =>
      editor.update(() => $setSelection(null), { onUpdate: resolve }),
    )
    getMenuOptions.mock.calls[0]?.[1]?.()
    await nextTick()

    expect(config.insertNode).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('abandons a check that a newer paste has superseded', async () => {
    const pending: ((value: { id: string; url: string } | null) => void)[] = []
    const parseUrl = vi.fn(
      (_url: string) =>
        new Promise<{ id: string; url: string } | null>((resolve) => {
          pending.push(resolve)
        }),
    )
    const config: EmbedConfig = { insertNode: vi.fn(), parseUrl, type: 'superseded' }
    const { editor, getMenuOptions, wrapper } = await mountAutoEmbed({ embedConfigs: [config] })

    await pasteLink(editor, 'https://example.com/first')
    await pasteLink(editor, 'https://example.com/second')
    expect(pending).toHaveLength(2)

    // The first check is resolved last, so its result is discarded rather than
    // opening a menu for a link the newer paste has replaced.
    pending[1]?.(null)
    await Promise.resolve()
    pending[0]?.({ id: 'first', url: 'https://example.com/first' })
    await Promise.resolve()
    await nextTick()

    expect(getMenuOptions).not.toHaveBeenCalled()
    expect(document.querySelector('.embed-option')).toBeNull()
    wrapper.unmount()
  })

  it('does not open the menu for a link the host disables', async () => {
    const { config, editor, getMenuOptions, wrapper } = await mountAutoEmbed({
      disableMenuFor: () => true,
    })
    await pasteLink(editor)

    expect(config.parseUrl).not.toHaveBeenCalled()
    expect(getMenuOptions).not.toHaveBeenCalled()
    expect(document.querySelector('.embed-option')).toBeNull()
    wrapper.unmount()
  })

  it('does not open the menu when the link becomes disabled while parsing', async () => {
    let resolveMatch: ((value: { id: string; url: string }) => void) | undefined
    const parseUrl = vi.fn(
      (_url: string) =>
        new Promise<{ id: string; url: string }>((resolve) => {
          resolveMatch = resolve
        }),
    )
    const config: EmbedConfig = { insertNode: vi.fn(), parseUrl, type: 'late-disable' }
    const disableMenuFor = vi.fn().mockReturnValueOnce(false).mockReturnValue(true)
    const { getMenuOptions, editor, wrapper } = await mountAutoEmbed({
      disableMenuFor,
      embedConfigs: [config],
    })
    await pasteLink(editor)

    resolveMatch?.({ id: 'late', url: 'https://example.com/video' })
    await Promise.resolve()
    await nextTick()

    expect(disableMenuFor).toHaveBeenCalledTimes(2)
    expect(getMenuOptions).not.toHaveBeenCalled()
    expect(document.querySelector('.embed-option')).toBeNull()
    wrapper.unmount()
  })
})
