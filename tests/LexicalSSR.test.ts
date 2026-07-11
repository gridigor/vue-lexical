// @vitest-environment node

import type { LexicalEditor } from 'lexical'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { HistoryPlugin } from '../src/LexicalHistoryPlugin'
import { OnChangePlugin } from '../src/LexicalOnChangePlugin'
import { PlainTextPlugin } from '../src/LexicalPlainTextPlugin'

const onError = (error: Error) => {
  throw error
}

describe('server-side rendering', () => {
  it('renders without browser globals or DOM listener registration', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    let editor: LexicalEditor | undefined
    const registerDecoratorListener = vi.fn()
    const registerEditableListener = vi.fn()
    const registerRootListener = vi.fn()
    const registerUpdateListener = vi.fn()
    const setRootElement = vi.fn()

    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        editor.registerDecoratorListener = registerDecoratorListener
        editor.registerEditableListener = registerEditableListener
        editor.registerRootListener = registerRootListener
        editor.registerUpdateListener = registerUpdateListener
        editor.setRootElement = setRootElement
        return () => null
      },
    })

    const App = defineComponent({
      setup() {
        return () =>
          h(
            LexicalComposer,
            { initialConfig: { namespace: 'ssr-editor', onError } },
            {
              default: () => [
                h(CaptureEditor),
                h(PlainTextPlugin, null, {
                  contentEditable: () => h(ContentEditable, { 'aria-label': 'Editor' }),
                  placeholder: () => 'Start typing',
                }),
                h(HistoryPlugin),
                h(OnChangePlugin),
              ],
            },
          )
      },
    })

    const html = await renderToString(createSSRApp(App))

    expect(html).toContain('aria-label="Editor"')
    expect(html).toContain('contenteditable="true"')
    expect(editor?.getRootElement()).toBeNull()
    expect(setRootElement).not.toHaveBeenCalled()
    expect(registerDecoratorListener).not.toHaveBeenCalled()
    expect(registerEditableListener).not.toHaveBeenCalled()
    expect(registerRootListener).not.toHaveBeenCalled()
    expect(registerUpdateListener).not.toHaveBeenCalled()
  })
})
