import type { LexicalEditor } from 'lexical'
import type { Klass } from 'lexical'
import { HashtagNode } from '@lexical/hashtag'
import type { EntityMatch } from '@lexical/text'
import { mount } from '@vue/test-utils'
import type { PropType, ShallowRef } from 'vue'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import {
  useLexicalTextEntity,
  type TextEntityMatcher,
  type TextEntityNodeFactory,
} from '../src/useLexicalTextEntity'

type RegisterLexicalTextEntity = (
  editor: LexicalEditor,
  getMatch: TextEntityMatcher,
  targetNode: Klass<HashtagNode>,
  createNode: TextEntityNodeFactory<HashtagNode>,
) => (() => void)[]

const mocks = vi.hoisted(() => ({
  cleanupPlainText: vi.fn<() => void>(),
  cleanupTargetNode: vi.fn<() => void>(),
  registerLexicalTextEntity: vi.fn<RegisterLexicalTextEntity>(),
}))

vi.mock('@lexical/text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lexical/text')>()),
  registerLexicalTextEntity: mocks.registerLexicalTextEntity,
}))

const onError = (error: Error) => {
  throw error
}

const TextEntityRegistration = defineComponent({
  props: {
    getMatch: {
      type: Object as PropType<ShallowRef<TextEntityMatcher>>,
      required: true,
    },
    targetNode: {
      type: Object as PropType<ShallowRef<Klass<HashtagNode>>>,
      required: true,
    },
    createNode: {
      type: Object as PropType<ShallowRef<TextEntityNodeFactory<HashtagNode>>>,
      required: true,
    },
  },
  setup(props) {
    useLexicalTextEntity(props.getMatch, props.targetNode, props.createNode)
    return () => null
  },
})

describe('useLexicalTextEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.registerLexicalTextEntity.mockReturnValue([
      mocks.cleanupPlainText,
      mocks.cleanupTargetNode,
    ])
  })

  it('registers raw values and cleans up both transforms', async () => {
    const getMatch = vi.fn<TextEntityMatcher>(() => null)
    const createNode = vi.fn<TextEntityNodeFactory<HashtagNode>>()
    const Registration = defineComponent({
      setup() {
        useLexicalTextEntity(getMatch, HashtagNode, createNode)
        return () => null
      },
    })
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'raw-text-entity', onError } },
      slots: { default: () => h(Registration) },
    })
    await nextTick()

    expect(mocks.registerLexicalTextEntity).toHaveBeenCalledOnce()
    expect(mocks.registerLexicalTextEntity).toHaveBeenCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
      getMatch,
      HashtagNode,
      createNode,
    )

    wrapper.unmount()
    expect(mocks.cleanupPlainText).toHaveBeenCalledOnce()
    expect(mocks.cleanupTargetNode).toHaveBeenCalledOnce()
  })

  it('re-registers transforms when a ref changes', async () => {
    const getMatch = shallowRef<TextEntityMatcher>(() => null)
    const targetNode = shallowRef<Klass<HashtagNode>>(HashtagNode)
    const createNode = shallowRef<TextEntityNodeFactory<HashtagNode>>(() => new HashtagNode())
    const wrapper = mount(LexicalComposer, {
      props: { initialConfig: { namespace: 'reactive-text-entity', onError } },
      slots: {
        default: () => h(TextEntityRegistration, { createNode, getMatch, targetNode }),
      },
    })
    await nextTick()

    const nextGetMatch = (_text: string): EntityMatch => ({ end: 1, start: 0 })
    getMatch.value = nextGetMatch
    await nextTick()

    expect(mocks.cleanupPlainText).toHaveBeenCalledOnce()
    expect(mocks.cleanupTargetNode).toHaveBeenCalledOnce()
    expect(mocks.registerLexicalTextEntity).toHaveBeenCalledTimes(2)
    expect(mocks.registerLexicalTextEntity).toHaveBeenLastCalledWith(
      expect.objectContaining<Partial<LexicalEditor>>({}),
      nextGetMatch,
      HashtagNode,
      createNode.value,
    )

    wrapper.unmount()
    expect(mocks.cleanupPlainText).toHaveBeenCalledTimes(2)
    expect(mocks.cleanupTargetNode).toHaveBeenCalledTimes(2)
  })
})
