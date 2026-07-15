import { FocusTrapExtension } from '@lexical/a11y'
import axe, { type ElementContext, type RunOptions } from 'axe-core'
import { defineExtension } from 'lexical'
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { LexicalExtensionComposer } from '../../src/LexicalExtensionComposer'
import { LexicalComposer } from '../../src/LexicalComposer'
import { ContentEditable } from '../../src/LexicalContentEditable'
import { useLexicalFocusTrapRef } from '../../src/useLexicalFocusTrapRef'

const axeOptions: RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
  },
}

async function expectNoAccessibilityViolations(context: ElementContext): Promise<void> {
  const results = await axe.run(context, axeOptions)
  const details = results.violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary ?? 'failed'}`)
          .join('\n')}`,
    )
    .join('\n')

  expect(results.violations, details).toEqual([])
}

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

  it('exposes an accessible contenteditable surface', async () => {
    const Root = defineComponent({
      setup: () => () =>
        h(
          LexicalComposer,
          {
            initialConfig: {
              namespace: 'accessibility-contenteditable-browser-test',
              onError(error: Error) {
                throw error
              },
            },
          },
          {
            default: () =>
              h(ContentEditable, {
                'aria-label': 'Rich-text editor',
                'aria-multiline': 'true',
              }),
          },
        ),
    })

    host = document.createElement('div')
    document.body.append(host)
    app = createApp(Root)
    app.mount(host)
    await nextTick()

    const editable = host.querySelector<HTMLElement>('[contenteditable="true"]')
    expect(editable).not.toBeNull()
    expect(editable?.getAttribute('role')).toBe('textbox')
    expect(editable?.getAttribute('aria-multiline')).toBe('true')
    await expectNoAccessibilityViolations(host)
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
              style: { minHeight: '24px', minWidth: '24px' },
            },
            'Open',
          ),
          open.value
            ? h('div', { 'data-trap': '', ref: trapRef, style: { display: 'flex', gap: '24px' } }, [
                h(
                  'a',
                  {
                    'data-first': '',
                    href: '#first',
                    style: {
                      alignItems: 'center',
                      display: 'inline-flex',
                      minHeight: '24px',
                      minWidth: '24px',
                    },
                  },
                  'First',
                ),
                h(
                  'button',
                  {
                    'data-last': '',
                    onClick: () => {
                      open.value = false
                    },
                    style: { minHeight: '24px', minWidth: '24px' },
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
          { contentEditable: null, extension: AccessibilityBrowserExtension },
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
    await expectNoAccessibilityViolations(host)

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
