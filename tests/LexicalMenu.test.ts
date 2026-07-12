import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type TextNode,
} from 'lexical'
import { describe, expect, it, vi } from 'vitest'
import {
  $splitNodeContainingQuery,
  isTriggerVisible,
  MenuOption,
  positionMenuAnchor,
  scrollIntoViewIfNeeded,
  setMenuAnchorAttributes,
} from '../src/menu/LexicalMenu'

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

describe('shared menu infrastructure', () => {
  it('stores option elements and configures an anchor', () => {
    const option = new MenuOption('vue')
    const element = document.createElement('li')
    option.setRefElement(element)
    expect(option.key).toBe('vue')
    expect(option.ref.current).toBe(element)

    option.setRefElement(document.createTextNode('not an element') as unknown as Element)
    expect(option.ref.current).toBeNull()

    const anchor = document.createElement('div')
    setMenuAnchorAttributes(anchor, 'menu-anchor')
    expect(anchor.className).toBe('menu-anchor')
    expect(anchor.getAttribute('role')).toBe('listbox')
    expect(anchor.style.position).toBe('absolute')

    setMenuAnchorAttributes(anchor)
    expect(anchor.className).toBe('')
  })

  it('positions the anchor inside editor bounds and flips it above when needed', () => {
    const root = document.createElement('div')
    const anchor = document.createElement('div')
    const menu = document.createElement('div')
    root.append(anchor)
    anchor.append(menu)
    const editor = createEditor()
    editor.setRootElement(root)
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(
      rect({ bottom: 300, right: 200, top: 0 }),
    )
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(rect({ height: 80, width: 100 }))
    Object.defineProperty(anchor, 'offsetHeight', { configurable: true, value: 4 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 250 })
    Object.defineProperty(window, 'pageXOffset', { configurable: true, value: 10 })
    Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 20 })

    positionMenuAnchor(
      anchor,
      { getRect: () => rect({ height: 10, left: 180, top: 200, width: 20 }) },
      editor,
    )
    expect(anchor.style.left).toBe('110px')
    expect(anchor.style.top).toBe('130px')
    expect(anchor.style.width).toBe('20px')

    positionMenuAnchor(
      anchor,
      { getRect: () => rect({ height: 10, left: 20, top: 20, width: 20 }) },
      editor,
      false,
    )
    expect(anchor.style.left).toBe('30px')
    expect(anchor.style.top).toBe('27px')

    const editorWithoutRoot = createEditor()
    anchor.style.left = '77px'
    positionMenuAnchor(anchor, { getRect: () => rect() }, editorWithoutRoot)
    expect(anchor.style.left).toBe('77px')
  })

  it('handles anchors without rendered menu content', () => {
    const root = document.createElement('div')
    const anchor = document.createElement('div')
    root.append(anchor)
    const editor = createEditor()
    editor.setRootElement(root)
    positionMenuAnchor(anchor, { getRect: () => rect({ left: 5, top: 6 }) }, editor)
    expect(anchor.style.left).toBe('15px')
  })

  it('scrolls only options inside the typeahead container', () => {
    const outside = document.createElement('div')
    expect(scrollIntoViewIfNeeded(outside)).toBe(false)

    const container = document.createElement('div')
    container.id = 'typeahead-menu'
    const option = document.createElement('div')
    container.append(option)
    document.body.append(container)
    const containerScroll = vi.fn()
    const optionScroll = vi.fn()
    container.scrollIntoView = containerScroll
    option.scrollIntoView = optionScroll
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect({ height: 30, top: -1 }))

    expect(scrollIntoViewIfNeeded(option)).toBe(true)
    expect(containerScroll).toHaveBeenCalledWith({ block: 'center' })
    expect(optionScroll).toHaveBeenCalledWith({ block: 'nearest' })

    containerScroll.mockClear()
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect({ height: 10, top: 10 }))
    expect(scrollIntoViewIfNeeded(option)).toBe(true)
    expect(containerScroll).not.toHaveBeenCalled()
    container.remove()
  })

  it('checks whether the trigger is inside its scroll container', () => {
    const target = document.createElement('div')
    const container = document.createElement('div')
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(rect({ bottom: 100, top: 20 }))
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect({ top: 15 }))
    expect(isTriggerVisible(target, container)).toBe(true)
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(rect({ top: 107 }))
    expect(isTriggerVisible(target, container)).toBe(false)
  })

  it('splits the text node containing the query', () => {
    const editor = createEditor()
    let queryText = ''
    editor.update(
      () => {
        const text = $createTextNode('Hello @vue')
        $getRoot().append($createParagraphNode().append(text))
        text.selectEnd()
        const queryNode = $splitNodeContainingQuery({
          leadOffset: 6,
          matchingString: 'vue',
          replaceableString: '@vue',
        })
        queryText = queryNode?.getTextContent() ?? ''
      },
      { discrete: true },
    )
    expect(queryText).toBe('@vue')

    editor.update(
      () => {
        const text = $createTextNode('@vue')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.selectEnd()
        expect(
          $splitNodeContainingQuery({
            leadOffset: 0,
            matchingString: 'vue-extra',
            replaceableString: '@vue',
          })?.getTextContent(),
        ).toBe('@vue')
      },
      { discrete: true },
    )

    editor.update(
      () => {
        const text = $createTextNode('vue')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.selectEnd()
        expect(
          $splitNodeContainingQuery({
            leadOffset: 0,
            matchingString: 'vue-more',
            replaceableString: 'x',
          })?.getTextContent(),
        ).toBe('vue')
      },
      { discrete: true },
    )

    editor.update(
      () => {
        const text = $createTextNode('a')
        $getRoot().clear().append($createParagraphNode().append(text))
        text.selectEnd()
        expect(
          $splitNodeContainingQuery({
            leadOffset: 0,
            matchingString: '',
            replaceableString: 'too-long',
          }),
        ).toBeNull()
        text.setMode('token')
        expect(
          $splitNodeContainingQuery({ leadOffset: 0, matchingString: '', replaceableString: 'a' }),
        ).toBeNull()
      },
      { discrete: true },
    )

    editor.update(
      () => {
        const text = $getRoot().getFirstDescendant() as TextNode
        text.select(0, 1)
        expect(
          $splitNodeContainingQuery({ leadOffset: 0, matchingString: '', replaceableString: '@' }),
        ).toBeNull()
      },
      { discrete: true },
    )
  })
})
