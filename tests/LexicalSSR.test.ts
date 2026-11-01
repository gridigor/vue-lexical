// @vitest-environment node

import type { LexicalEditor } from 'lexical'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { createCollaborationContext } from '../src/LexicalCollaborationContextUtils'
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

  it('picks a collaboration identity without reading Math.random', () => {
    const random = vi.spyOn(Math, 'random')

    const context = createCollaborationContext()
    const second = createCollaborationContext()

    // A random identity would differ from the one the browser picks and make
    // hydration mismatch, so the server always uses the first entry.
    expect(random).not.toHaveBeenCalled()
    expect(context.name).toBe('Cat')
    expect(context.color).toBe('rgb(125, 50, 0)')
    expect(second.name).toBe(context.name)
    expect(second.color).toBe(context.color)

    const named = createCollaborationContext('Ada', 'rgb(1, 2, 3)')
    expect(named.name).toBe('Ada')
    expect(named.color).toBe('rgb(1, 2, 3)')

    random.mockRestore()
  })
})
