import {
  AriaLiveRegionExtension,
  FocusManagerExtension,
  FocusTrapExtension,
  RovingTabIndexExtension,
} from '@lexical/a11y'
import { defineExtension } from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LexicalExtensionComposer } from '../src/LexicalExtensionComposer'
import { useLexicalAriaLiveRegion } from '../src/useLexicalAriaLiveRegion'
import { useLexicalFocusManagerRef } from '../src/useLexicalFocusManagerRef'
import { useLexicalFocusTrapRef } from '../src/useLexicalFocusTrapRef'
import { useLexicalRovingTabIndexRef } from '../src/useLexicalRovingTabIndexRef'
import { useLexicalExtensionElementRef } from '../src/useLexicalExtensionElementRef'

const AccessibilityExtension = defineExtension({
  dependencies: [
    AriaLiveRegionExtension,
    FocusManagerExtension,
    FocusTrapExtension,
    RovingTabIndexExtension,
  ],
  name: 'accessibility-test',
  namespace: 'accessibility-test',
})

function dispatchKey(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.querySelectorAll('[aria-live]').forEach((element) => element.remove())
})

describe('Lexical accessibility composables', () => {
  it('does not register an extension ref before a DOM element is attached', async () => {
    const register = vi.fn(() => vi.fn())
    const Harness = defineComponent({
      setup() {
        useLexicalExtensionElementRef(register)
        return () => null
      },
    })

    const wrapper = mount(Harness)
    await nextTick()
    expect(register).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('announces messages through AriaLiveRegionExtension', async () => {
    let announce: ((message: string) => void) | undefined
    const Harness = defineComponent({
      setup() {
        announce = useLexicalAriaLiveRegion()
        return () => null
      },
    })
    const wrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(Harness) },
    })

    announce?.('Formatting enabled')
    await nextTick()
    const region = document.body.querySelector<HTMLElement>('[aria-live]')
    expect(region?.getAttribute('aria-live')).toBe('polite')
    expect(region?.getAttribute('aria-atomic')).toBe('true')
    expect(region?.textContent).toBe('Formatting enabled')

    wrapper.unmount()
    expect(document.body.querySelector('[aria-live]')).toBeNull()
  })

  it('moves focus between the editor and a toolbar and reacts to options', async () => {
    const options = ref({ toolbarItemSelector: '[data-toolbar-item]' })
    const Toolbar = defineComponent({
      setup() {
        const toolbarRef = useLexicalFocusManagerRef(options)
        return () =>
          h('div', { ref: toolbarRef, role: 'toolbar' }, [
            h('button', { 'data-first': '' }, 'Ignored'),
            h('button', { 'data-toolbar-item': '' }, 'Managed'),
          ])
      },
    })
    const wrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(Toolbar) },
    })
    const root = wrapper.get<HTMLElement>('[contenteditable="true"]').element
    const ignored = wrapper.get<HTMLButtonElement>('[data-first]').element
    const managed = wrapper.get<HTMLButtonElement>('[data-toolbar-item]').element

    root.focus()
    dispatchKey(root, 'F10', { altKey: true })
    expect(document.activeElement).toBe(managed)

    dispatchKey(managed, 'Escape')
    expect(document.activeElement).toBe(root)

    options.value = { toolbarItemSelector: '[data-first]' }
    await nextTick()
    root.focus()
    dispatchKey(root, 'F10', { altKey: true })
    expect(document.activeElement).toBe(ignored)

    wrapper.unmount()
  })

  it('activates, updates, and releases a focus trap', async () => {
    const active = ref(false)
    const initialFocus = ref<'firstFocusable' | 'container'>('firstFocusable')
    const allowOutside = ref<(target: HTMLElement) => boolean>((target) =>
      target.hasAttribute('data-allowed'),
    )
    const Trap = defineComponent({
      setup() {
        const trapRef = useLexicalFocusTrapRef(active, initialFocus, allowOutside)
        return () =>
          h('div', { ref: trapRef, tabindex: -1 }, [h('button', { 'data-trapped': '' }, 'Trapped')])
      },
    })
    const opener = document.createElement('button')
    const outside = document.createElement('button')
    const allowed = document.createElement('button')
    allowed.dataset.allowed = ''
    document.body.append(opener, outside, allowed)
    opener.focus()

    const wrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(Trap) },
    })
    const trapped = wrapper.get<HTMLButtonElement>('[data-trapped]').element
    expect(document.activeElement).toBe(opener)

    active.value = true
    await nextTick()
    expect(document.activeElement).toBe(trapped)

    allowed.focus()
    expect(document.activeElement).toBe(allowed)
    outside.focus()
    expect(document.activeElement).toBe(trapped)

    allowOutside.value = () => false
    initialFocus.value = 'container'
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('[tabindex="-1"]').element)

    active.value = false
    await nextTick()
    outside.focus()
    expect(document.activeElement).toBe(outside)

    wrapper.unmount()
    opener.remove()
    outside.remove()
    allowed.remove()
  })

  it('supports default focus-trap options and a direct outside predicate', () => {
    const outside = document.createElement('button')
    const allowed = document.createElement('button')
    allowed.dataset.allowed = ''
    document.body.append(outside, allowed)
    const DefaultTrap = defineComponent({
      setup() {
        const trapRef = useLexicalFocusTrapRef(true)
        return () => h('div', { ref: trapRef }, [h('button', { 'data-default-trap': '' })])
      },
    })
    const PredicateTrap = defineComponent({
      setup() {
        const trapRef = useLexicalFocusTrapRef(true, undefined, (target) =>
          target.hasAttribute('data-allowed'),
        )
        return () => h('div', { ref: trapRef }, [h('button', { 'data-predicate-trap': '' })])
      },
    })

    const defaultWrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(DefaultTrap) },
    })
    const defaultTarget = defaultWrapper.get<HTMLButtonElement>('[data-default-trap]').element
    outside.focus()
    expect(document.activeElement).toBe(defaultTarget)
    defaultWrapper.unmount()

    const predicateWrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(PredicateTrap) },
    })
    allowed.focus()
    expect(document.activeElement).toBe(allowed)
    predicateWrapper.unmount()
    outside.remove()
    allowed.remove()
  })

  it('manages roving tabindex and re-registers reactive options', async () => {
    const options = ref<{ orientation: 'horizontal' | 'vertical' }>({
      orientation: 'horizontal',
    })
    const Group = defineComponent({
      setup() {
        const groupRef = useLexicalRovingTabIndexRef(options)
        return () =>
          h('div', { ref: groupRef }, [
            h('button', { 'data-item': 'first' }, 'First'),
            h('button', { 'data-item': 'second' }, 'Second'),
          ])
      },
    })
    const wrapper = mount(LexicalExtensionComposer, {
      attachTo: document.body,
      props: { extension: AccessibilityExtension },
      slots: { default: () => h(Group) },
    })
    const first = wrapper.get<HTMLButtonElement>('[data-item="first"]').element
    const second = wrapper.get<HTMLButtonElement>('[data-item="second"]').element
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(-1)

    first.focus()
    dispatchKey(first, 'ArrowRight')
    expect(document.activeElement).toBe(second)

    options.value = { orientation: 'vertical' }
    await nextTick()
    first.focus()
    dispatchKey(first, 'ArrowRight')
    expect(document.activeElement).toBe(first)
    dispatchKey(first, 'ArrowDown')
    expect(document.activeElement).toBe(second)

    wrapper.unmount()
    expect(first.tabIndex).toBe(0)
    expect(second.tabIndex).toBe(0)
  })
})
