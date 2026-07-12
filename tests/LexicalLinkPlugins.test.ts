import type { ElementNode, LexicalEditor } from 'lexical'
import { AutoLinkNode, LinkNode, type LinkAttributes, type LinkMatcher } from '@lexical/link'
import { mount } from '@vue/test-utils'
import type { Component, PropType } from 'vue'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalAutoLinkPlugin } from '../src/LexicalAutoLinkPlugin'
import { LexicalClickableLinkPlugin } from '../src/LexicalClickableLinkPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalErrorBoundary } from '../src/LexicalErrorBoundary'
import { LexicalLinkPlugin } from '../src/LexicalLinkPlugin'

type RegisterLink = (typeof import('@lexical/link'))['registerLink']
type RegisterAutoLink = (typeof import('@lexical/link'))['registerAutoLink']
type RegisterClickableLink = (typeof import('@lexical/link'))['registerClickableLink']

const mocks = vi.hoisted(() => ({
  autoCleanup: vi.fn<() => void>(),
  clickableCleanup: vi.fn<() => void>(),
  linkCleanup: vi.fn<() => void>(),
  registerAutoLink: vi.fn<RegisterAutoLink>(),
  registerClickableLink: vi.fn<RegisterClickableLink>(),
  registerLink: vi.fn<RegisterLink>(),
}))

vi.mock('@lexical/link', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/link')>()),
  registerAutoLink: mocks.registerAutoLink,
  registerClickableLink: mocks.registerClickableLink,
  registerLink: mocks.registerLink,
}))

const onError = (error: Error) => {
  throw error
}

describe('link plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registerLink.mockReturnValue(mocks.linkCleanup)
    mocks.registerAutoLink.mockReturnValue(mocks.autoCleanup)
    mocks.registerClickableLink.mockReturnValue(mocks.clickableCleanup)
  })

  it('registers LinkPlugin, reacts to props, and cleans up', async () => {
    const validateUrl = vi.fn((url: string) => url.startsWith('https://'))
    const attributes: LinkAttributes = { rel: 'noreferrer', target: '_blank' }
    const nextAttributes: LinkAttributes = { title: 'Documentation' }
    const TestEditor = defineComponent({
      props: {
        validateUrl: {
          type: Function as PropType<(url: string) => boolean>,
          default: undefined,
        },
        attributes: {
          type: Object as PropType<LinkAttributes>,
          default: undefined,
        },
      },
      setup: (props) => () =>
        h(
          LexicalComposer,
          {
            initialConfig: { namespace: 'reactive-link', nodes: [LinkNode], onError },
          },
          {
            default: () => h(LexicalLinkPlugin, props),
          },
        ),
    })
    const wrapper = mount(TestEditor, { props: { attributes, validateUrl } })
    await nextTick()

    const editor = mocks.registerLink.mock.calls[0]?.[0]
    const stores = mocks.registerLink.mock.calls[0]?.[1]
    expect(editor).toEqual(expect.objectContaining<Partial<LexicalEditor>>({}))
    expect(stores?.validateUrl.peek()).toBe(validateUrl)
    expect(stores?.attributes.peek()).toEqual(attributes)

    await wrapper.setProps({ attributes: nextAttributes, validateUrl: undefined })
    expect(mocks.linkCleanup).toHaveBeenCalledOnce()
    expect(mocks.registerLink).toHaveBeenCalledTimes(2)
    expect(mocks.registerLink.mock.calls[1]?.[1].validateUrl.peek()).toBeUndefined()
    expect(mocks.registerLink.mock.calls[1]?.[1].attributes.peek()).toEqual(nextAttributes)

    wrapper.unmount()
    expect(mocks.linkCleanup).toHaveBeenCalledTimes(2)
  })

  it('registers AutoLinkPlugin defaults, reacts to props, and cleans up', async () => {
    const matcher: LinkMatcher = (text) =>
      text === 'vue.dev' ? { index: 0, length: 7, text, url: 'https://vue.dev' } : null
    const nextMatcher: LinkMatcher = () => null
    const onChange = vi.fn()
    const excludeParent = vi.fn((_parent: ElementNode) => true)
    const TestEditor = defineComponent({
      props: {
        matchers: { type: Array as PropType<LinkMatcher[]>, required: true },
        onChange: { type: Function as PropType<typeof onChange>, default: undefined },
        excludeParents: {
          type: Array as PropType<Array<(parent: ElementNode) => boolean>>,
          default: undefined,
        },
      },
      setup: (props) => () =>
        h(
          LexicalComposer,
          {
            initialConfig: { namespace: 'reactive-auto-link', nodes: [AutoLinkNode], onError },
          },
          {
            default: () => h(LexicalAutoLinkPlugin, props),
          },
        ),
    })
    const wrapper = mount(TestEditor, { props: { matchers: [matcher] } })
    await nextTick()

    expect(mocks.registerAutoLink.mock.calls[0]?.[1]).toEqual({
      changeHandlers: [],
      excludeParents: [],
      matchers: [matcher],
    })

    await wrapper.setProps({
      excludeParents: [excludeParent],
      matchers: [nextMatcher],
      onChange,
    })
    expect(mocks.autoCleanup).toHaveBeenCalledOnce()
    expect(mocks.registerAutoLink).toHaveBeenLastCalledWith(
      mocks.registerAutoLink.mock.calls[0]?.[0],
      {
        changeHandlers: [onChange],
        excludeParents: [excludeParent],
        matchers: [nextMatcher],
      },
    )

    wrapper.unmount()
    expect(mocks.autoCleanup).toHaveBeenCalledTimes(2)
  })

  it('registers ClickableLinkPlugin defaults, reacts to props, and cleans up', async () => {
    const TestEditor = defineComponent({
      props: {
        disabled: { type: Boolean, default: false },
        newTab: { type: Boolean, default: true },
      },
      setup: (props) => () =>
        h(
          LexicalComposer,
          {
            initialConfig: { namespace: 'reactive-clickable-link', onError },
          },
          {
            default: () => h(LexicalClickableLinkPlugin, props),
          },
        ),
    })
    const wrapper = mount(TestEditor)
    await nextTick()

    const editor = mocks.registerClickableLink.mock.calls[0]?.[0]
    const stores = mocks.registerClickableLink.mock.calls[0]?.[1]
    expect(stores?.newTab.peek()).toBe(true)
    expect(stores?.disabled.peek()).toBe(false)

    await wrapper.setProps({ disabled: true, newTab: false })
    expect(mocks.clickableCleanup).toHaveBeenCalledOnce()
    expect(mocks.registerClickableLink.mock.calls[1]?.[0]).toBe(editor)
    expect(mocks.registerClickableLink.mock.calls[1]?.[1].newTab.peek()).toBe(false)
    expect(mocks.registerClickableLink.mock.calls[1]?.[1].disabled.peek()).toBe(true)

    wrapper.unmount()
    expect(mocks.clickableCleanup).toHaveBeenCalledTimes(2)
  })

  it.each([
    [LexicalLinkPlugin, 'LexicalLinkPlugin: LinkNode not registered on editor'],
    [LexicalAutoLinkPlugin, 'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor'],
  ])('reports a missing node for %s', async (component, message) => {
    const onBoundaryError = vi.fn()
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'missing-link-node', onError } },
      slots: {
        default: () =>
          h(
            LexicalErrorBoundary,
            { onError: onBoundaryError },
            {
              default: () =>
                h(
                  component as Component,
                  component === LexicalAutoLinkPlugin ? { matchers: [] } : {},
                ),
              fallback: ({ error }: { error: Error }) =>
                h('span', { 'data-error': '' }, error.message),
            },
          ),
      },
    })
    await nextTick()

    expect(wrapper.get('[data-error]').text()).toBe(message)
    expect(onBoundaryError).toHaveBeenCalledOnce()
  })

  it('exports a working regular-expression matcher helper', async () => {
    const { createLinkMatcherWithRegExp } = await import('../src/LexicalAutoLinkPlugin')
    const matcher = createLinkMatcherWithRegExp(/vue\.dev/, (text) => `https://${text}`)

    expect(matcher('Visit vue.dev')).toEqual({
      index: 6,
      length: 7,
      text: 'vue.dev',
      url: 'https://vue.dev',
    })
    expect(matcher('No link')).toBeNull()
  })
})
