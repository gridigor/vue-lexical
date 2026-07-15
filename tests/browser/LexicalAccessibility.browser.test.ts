import { FocusTrapExtension } from '@lexical/a11y'
import { defineExtension } from 'lexical'
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { LexicalExtensionComposer } from '../../src/LexicalExtensionComposer'
import { useLexicalFocusTrapRef } from '../../src/useLexicalFocusTrapRef'

const AccessibilityBrowserExtension = defineExtension({
  dependencies: [FocusTrapExtension],
  name: 'accessibility-browser-test',
  namespace: 'accessibility-browser-test',
})

describe('Lexical accessibility in a real browser', () => {
  let app: App | undefined
  let host: HTMLElement | undefined

  afterEach(() => {
    app?.unmount()
    app = undefined
    host?.remove()
    host = undefined
  })

  it('focuses and traps a dialog opened by a click, then restores focus', async () => {
    const Harness = defineComponent({
      setup() {
        const open = ref(false)
        const trapRef = useLexicalFocusTrapRef(open)
        return () => [
          h(
            'button',
            {
              'data-opener': '',
              onClick: () => {
                open.value = true
              },
            },
            'Open',
          ),
          open.value
            ? h('div', { 'data-trap': '', ref: trapRef }, [
                h('a', { 'data-first': '', href: '#first' }, 'First'),
                h(
                  'button',
                  {
                    'data-last': '',
                    onClick: () => {
                      open.value = false
                    },
                  },
                  'Close',
                ),
              ])
            : null,
        ]
      },
    })
    const Root = defineComponent({
      setup: () => () =>
        h(
          LexicalExtensionComposer,
          { extension: AccessibilityBrowserExtension },
          { default: () => h(Harness) },
        ),
    })

    host = document.createElement('div')
    document.body.append(host)
    app = createApp(Root)
    app.mount(host)
    await nextTick()

    const opener = host.querySelector<HTMLButtonElement>('[data-opener]')!
    opener.focus()
    opener.click()
    await nextTick()
    const first = host.querySelector<HTMLAnchorElement>('[data-first]')!
    const last = host.querySelector<HTMLButtonElement>('[data-last]')!
    expect(document.activeElement).toBe(first)

    last.focus()
    last.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Tab' }),
    )
    expect(document.activeElement).toBe(first)

    last.click()
    await nextTick()
    expect(host.querySelector('[data-trap]')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
