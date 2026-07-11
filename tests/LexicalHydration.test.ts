import type { LexicalEditor } from 'lexical'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import { PlainTextPlugin } from '../src/LexicalPlainTextPlugin'

const onError = (error: Error) => {
  throw error
}

describe('hydration', () => {
  it('hydrates the SSR root and connects the client editor without mismatch warnings', async () => {
    let editor: LexicalEditor | undefined
    const CaptureEditor = defineComponent({
      setup() {
        editor = useLexicalComposer()
        return () => null
      },
    })
    const initialConfig = {
      namespace: 'hydrated-editor',
      onError,
      editorState: () => {
        $getRoot().append($createParagraphNode().append($createTextNode('Hydrated text')))
      },
    }
    const App = defineComponent({
      setup() {
        return () =>
          h(
            LexicalComposer,
            { initialConfig },
            {
              default: () => [
                h(PlainTextPlugin, null, {
                  contentEditable: () => h(ContentEditable, { 'aria-label': 'Editor' }),
                }),
                h(CaptureEditor),
              ],
            },
          )
      },
    })

    const serverHtml = await renderToString(createSSRApp(App))
    const container = document.createElement('div')
    container.innerHTML = serverHtml
    document.body.append(container)

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createSSRApp(App)

    try {
      app.mount(container)
      await nextTick()

      const root = container.querySelector<HTMLElement>('[contenteditable="true"]')
      expect(root).not.toBeNull()
      expect(editor?.getRootElement()).toBe(root)
      expect(root?.textContent).toBe('Hydrated text')
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      app.unmount()
      consoleError.mockRestore()
      container.remove()
    }

    expect(editor?.getRootElement()).toBeNull()
  })
})
