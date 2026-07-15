import type { LexicalEditor } from 'lexical'
import { getScrollParent as getScrollParentFromUtils } from '@lexical/utils'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { getScrollParent, useDynamicPositioning } from '../src/LexicalTypeaheadMenuPlugin'
import type { MenuResolution } from '../src/menu/LexicalMenu'

const onError = (error: Error) => {
  throw error
}

const rect = (values: Partial<DOMRect> = {}): DOMRect =>
  ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...values,
  }) as DOMRect

class TestResizeObserver {
  static instances: TestResizeObserver[] = []
  readonly callback: ResizeObserverCallback
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    TestResizeObserver.instances.push(this)
  }
}

afterEach(() => {
  TestResizeObserver.instances = []
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('public menu positioning helpers', () => {
  it('re-exports getScrollParent from @lexical/utils', () => {
    expect(getScrollParent).toBe(getScrollParentFromUtils)
  })

  it('reacts to resize, scroll, visibility changes, and cleans up', async () => {
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    let queuedFrame: FrameRequestCallback | undefined
    const requestAnimationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        queuedFrame = callback
        return 42
      })
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')
    const root = document.createElement('div')
    const target = document.createElement('div')
    document.body.append(root, target)
    vi.spyOn(document.body, 'getBoundingClientRect').mockReturnValue(rect({ bottom: 100, top: 0 }))
    const targetRect = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect({ top: 50 }))
    const resolution = ref<MenuResolution | null>(null)
    const targetElement = ref<HTMLElement | null>(null)
    const onReposition = vi.fn()
    const onVisibilityChange = vi.fn()
    let editor: LexicalEditor | undefined

    const Harness = defineComponent({
      setup() {
        editor = useLexicalComposer()
        editor.setRootElement(root)
        useDynamicPositioning(resolution, targetElement, onReposition, onVisibilityChange)
        return () => null
      },
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'dynamic-positioning', onError } },
      slots: { default: () => h(Harness) },
    })

    targetElement.value = target
    await nextTick()
    expect(TestResizeObserver.instances).toHaveLength(0)

    resolution.value = { getRect: () => rect() }
    await nextTick()
    const observer = TestResizeObserver.instances[0]
    expect(observer?.observe).toHaveBeenCalledWith(target)

    window.dispatchEvent(new Event('resize'))
    expect(onReposition).toHaveBeenCalledOnce()
    observer?.callback([], observer as unknown as ResizeObserver)
    expect(onReposition).toHaveBeenCalledTimes(2)

    targetRect.mockReturnValue(rect({ top: 150 }))
    document.dispatchEvent(new Event('scroll'))
    document.dispatchEvent(new Event('scroll'))
    expect(requestAnimationFrame).toHaveBeenCalledOnce()
    expect(onVisibilityChange).toHaveBeenCalledOnce()
    expect(onVisibilityChange).toHaveBeenCalledWith(false)
    queuedFrame?.(0)
    expect(onReposition).toHaveBeenCalledTimes(3)

    targetRect.mockReturnValue(rect({ top: 50 }))
    document.dispatchEvent(new Event('scroll'))
    expect(onVisibilityChange).toHaveBeenLastCalledWith(true)
    wrapper.unmount()

    expect(observer?.unobserve).toHaveBeenCalledWith(target)
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
    editor?.setRootElement(null)
  })

  it('listens inside the editor root enclosing shadow tree', async () => {
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    const host = document.createElement('div')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    const scrollContainer = document.createElement('div')
    const editorRoot = document.createElement('div')
    const target = document.createElement('div')
    scrollContainer.style.overflow = 'auto'
    scrollContainer.append(editorRoot)
    shadowRoot.append(scrollContainer)
    document.body.append(host, target)
    const shadowListener = vi.spyOn(shadowRoot, 'addEventListener')
    let editor: LexicalEditor | undefined

    const Harness = defineComponent({
      setup() {
        editor = useLexicalComposer()
        editor.setRootElement(editorRoot)
        useDynamicPositioning({ getRect: () => rect() }, target, () => {})
        return () => null
      },
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'shadow-dynamic-positioning', onError } },
      slots: { default: () => h(Harness) },
    })
    await nextTick()

    expect(shadowListener.mock.calls.some(([eventName]) => eventName === 'scroll')).toBe(true)
    wrapper.unmount()
    editor?.setRootElement(null)
  })
})
