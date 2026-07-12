import type { LexicalEditor } from 'lexical'
import { ListItemNode, ListNode } from '@lexical/list'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalCheckListPlugin } from '../src/LexicalCheckListPlugin'
import { LexicalComposer } from '../src/LexicalComposer'
import { LexicalErrorBoundary } from '../src/LexicalErrorBoundary'
import { LexicalListPlugin } from '../src/LexicalListPlugin'

type RegisterCheckList = (typeof import('@lexical/list'))['registerCheckList']
type RegisterList = (typeof import('@lexical/list'))['registerList']
type RegisterListStrictIndentTransform =
  (typeof import('@lexical/list'))['registerListStrictIndentTransform']

const mocks = vi.hoisted(() => ({
  checkListCleanup: vi.fn<() => void>(),
  listCleanup: vi.fn<() => void>(),
  registerCheckList: vi.fn<RegisterCheckList>(),
  registerList: vi.fn<RegisterList>(),
  registerListStrictIndentTransform: vi.fn<RegisterListStrictIndentTransform>(),
  strictIndentCleanup: vi.fn<() => void>(),
}))

vi.mock('@lexical/list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/list')>()),
  registerCheckList: mocks.registerCheckList,
  registerList: mocks.registerList,
  registerListStrictIndentTransform: mocks.registerListStrictIndentTransform,
}))

const onError = (error: Error) => {
  throw error
}

const TestListEditor = defineComponent({
  props: {
    hasStrictIndent: { type: Boolean, default: false },
    shouldPreserveNumbering: { type: Boolean, default: false },
  },
  setup: (props) => () =>
    h(
      LexicalComposer,
      {
        initialConfig: {
          namespace: 'list-plugin',
          nodes: [ListNode, ListItemNode],
          onError,
        },
      },
      { default: () => h(LexicalListPlugin, props) },
    ),
})

const TestCheckListEditor = defineComponent({
  props: {
    disableTakeFocusOnClick: { type: Boolean, default: false },
  },
  setup: (props) => () =>
    h(
      LexicalComposer,
      { initialConfig: { namespace: 'check-list-plugin', onError } },
      { default: () => h(LexicalCheckListPlugin, props) },
    ),
})

describe('list plugins', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registerCheckList.mockReturnValue(mocks.checkListCleanup)
    mocks.registerList.mockReturnValue(mocks.listCleanup)
    mocks.registerListStrictIndentTransform.mockReturnValue(mocks.strictIndentCleanup)
  })

  it('registers ListPlugin defaults and cleans up on unmount', async () => {
    const wrapper = mount(TestListEditor)
    await nextTick()

    expect(mocks.registerList).toHaveBeenCalledOnce()
    expect(mocks.registerList).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
      { restoreNumbering: false },
    )
    expect(mocks.registerListStrictIndentTransform).not.toHaveBeenCalled()

    wrapper.unmount()
    expect(mocks.listCleanup).toHaveBeenCalledOnce()
  })

  it('reacts to ListPlugin options and removes strict transforms', async () => {
    const wrapper = mount(TestListEditor, {
      props: { hasStrictIndent: true, shouldPreserveNumbering: true },
    })
    await nextTick()
    const editor = mocks.registerList.mock.calls[0]?.[0]

    expect(mocks.registerList).toHaveBeenLastCalledWith(editor, { restoreNumbering: true })
    expect(mocks.registerListStrictIndentTransform).toHaveBeenCalledWith(editor)

    await wrapper.setProps({ hasStrictIndent: false, shouldPreserveNumbering: false })

    expect(mocks.listCleanup).toHaveBeenCalledOnce()
    expect(mocks.strictIndentCleanup).toHaveBeenCalledOnce()
    expect(mocks.registerList).toHaveBeenLastCalledWith(editor, { restoreNumbering: false })

    wrapper.unmount()
    expect(mocks.listCleanup).toHaveBeenCalledTimes(2)
    expect(mocks.strictIndentCleanup).toHaveBeenCalledOnce()
  })

  it('reports missing list nodes through an error boundary', async () => {
    const onBoundaryError = vi.fn()
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'missing-list-nodes', onError } },
      slots: {
        default: () =>
          h(
            LexicalErrorBoundary,
            { onError: onBoundaryError },
            {
              default: () => h(LexicalListPlugin),
              fallback: ({ error }: { error: Error }) =>
                h('span', { 'data-error': '' }, error.message),
            },
          ),
      },
    })
    await nextTick()

    expect(wrapper.get('[data-error]').text()).toBe(
      'LexicalListPlugin: ListNode and/or ListItemNode not registered on editor',
    )
    expect(onBoundaryError).toHaveBeenCalledOnce()
  })

  it('registers CheckListPlugin, reacts to focus behavior, and cleans up', async () => {
    const wrapper = mount(TestCheckListEditor)
    await nextTick()
    const editor = mocks.registerCheckList.mock.calls[0]?.[0]

    expect(mocks.registerCheckList).toHaveBeenCalledWith(editor, {
      disableTakeFocusOnClick: false,
    })

    await wrapper.setProps({ disableTakeFocusOnClick: true })

    expect(mocks.checkListCleanup).toHaveBeenCalledOnce()
    expect(mocks.registerCheckList).toHaveBeenLastCalledWith(editor, {
      disableTakeFocusOnClick: true,
    })

    wrapper.unmount()
    expect(mocks.checkListCleanup).toHaveBeenCalledTimes(2)
  })
})
