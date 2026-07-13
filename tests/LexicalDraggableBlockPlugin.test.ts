import type { LexicalEditor } from 'lexical'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
} from 'lexical'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LexicalComposer } from '../src/LexicalComposer'
import { useLexicalComposer } from '../src/LexicalComposerContext'
import { ContentEditable } from '../src/LexicalContentEditable'
import {
  DraggableBlockPlugin,
  type DraggableBlockSlotProps,
} from '../src/LexicalDraggableBlockPlugin'

class TestDragEvent extends MouseEvent {
  readonly dataTransfer: DataTransfer | null

  constructor(type: string, init: MouseEventInit & { dataTransfer?: DataTransfer | null } = {}) {
    super(type, init)
    this.dataTransfer = init.dataTransfer ?? null
  }
}

vi.stubGlobal('DragEvent', TestDragEvent)

const onError = (error: Error) => {
  throw error
}

function rect(top: number, bottom: number, width = 300): DOMRect {
  return {
    bottom,
    height: bottom - top,
    left: 0,
    right: width,
    top,
    width,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

function setRect(element: Element, value: DOMRect): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(value)
}

function createDataTransfer(types: string[] = []) {
  const values = new Map<string, string>()
  return {
    clearData: vi.fn(),
    dropEffect: 'move',
    effectAllowed: 'all',
    files: [],
    getData: vi.fn((type: string) => values.get(type) ?? ''),
    items: [],
    setData: vi.fn((type: string, value: string) => {
      values.set(type, value)
    }),
    setDragImage: vi.fn(),
    types,
  } as unknown as DataTransfer
}

function dragEvent(
  type: string,
  target: EventTarget,
  dataTransfer: DataTransfer,
  clientY: number,
): DragEvent {
  const event = new TestDragEvent(type, { bubbles: true, cancelable: true, clientY, dataTransfer })
  Object.defineProperty(event, 'target', { configurable: true, value: target })
  return event as DragEvent
}

function captureEditor(onCapture: (editor: LexicalEditor) => void) {
  return defineComponent({
    name: 'DraggableEditorCapture',
    setup() {
      onCapture(useLexicalComposer())
      return () => null
    },
  })
}

async function flush(): Promise<void> {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('DraggableBlockPlugin', () => {
  it('positions the handle and reorders top-level blocks with drag and drop', async () => {
    const anchor = document.createElement('div')
    document.body.append(anchor)
    const host = document.createElement('div')
    anchor.append(host)
    setRect(anchor, rect(0, 200, 400))
    let editor: LexicalEditor | undefined
    const changes: Array<HTMLElement | null> = []
    const Capture = captureEditor((value) => {
      editor = value
    })

    const wrapper = mount(LexicalComposer, {
      attachTo: host,
      props: {
        initialConfig: {
          namespace: 'draggable-blocks',
          onError,
          editorState: () => {
            $getRoot().append(
              $createParagraphNode().append($createTextNode('one')),
              $createParagraphNode().append($createTextNode('two')),
              $createParagraphNode().append($createTextNode('three')),
            )
          },
        },
      },
      slots: {
        default: () => [
          h(ContentEditable),
          h(
            DraggableBlockPlugin,
            {
              anchorElement: anchor,
              isOnMenu: (element: HTMLElement) => element.classList.contains('ignore-hover'),
              onElementChanged: (element: HTMLElement | null) => changes.push(element),
            },
            {
              menu: ({ blockElement }: DraggableBlockSlotProps) =>
                h('button', { class: 'drag-handle' }, blockElement?.textContent ?? 'none'),
              targetLine: () => h('span', { class: 'drop-line' }),
            },
          ),
          h(Capture),
        ],
      },
    })

    await flush()
    if (editor === undefined) {
      throw new Error('Expected editor.')
    }

    const root = wrapper.get('[contenteditable]').element as HTMLElement
    const paragraphs = Array.from(root.children) as HTMLElement[]
    expect(paragraphs).toHaveLength(3)
    setRect(paragraphs[0], rect(10, 30))
    setRect(paragraphs[1], rect(40, 60))
    setRect(paragraphs[2], rect(70, 90))

    const menu = anchor.querySelector<HTMLElement>('[draggable]')
    const line = anchor.querySelector<HTMLElement>('[aria-hidden="true"]')
    if (menu === null || line === null) {
      throw new Error('Expected teleported drag controls.')
    }
    setRect(menu, rect(0, 12, 20))

    const idleTransfer = createDataTransfer()
    menu.dispatchEvent(
      new TestDragEvent('dragstart', { bubbles: true, dataTransfer: idleTransfer }),
    )
    expect(idleTransfer.setData).not.toHaveBeenCalled()
    expect(
      editor.dispatchCommand(
        DRAGOVER_COMMAND,
        dragEvent('dragover', paragraphs[0], idleTransfer, 20),
      ),
    ).toBe(false)
    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[0], idleTransfer, 20)),
    ).toBe(false)

    paragraphs[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 50 }))
    await flush()
    expect(menu.style.opacity).toBe('1')
    expect(menu.style.transform).toContain('translate(4px')
    expect(anchor.querySelector('.drag-handle')?.textContent).toBe('two')
    expect(changes.at(-1)).toBe(paragraphs[1])

    const looseText = document.createTextNode('loose')
    root.append(looseText)
    looseText.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 50 }))
    await flush()
    expect(changes.at(-1)).toBe(null)
    looseText.remove()
    paragraphs[1].dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 50 }))
    await flush()

    const ignored = document.createElement('span')
    ignored.className = 'ignore-hover'
    paragraphs[0].append(ignored)
    ignored.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 20 }))
    expect(changes.at(-1)).toBe(paragraphs[1])

    const lexicalKeyProperty = `__lexicalKey_${String(Reflect.get(editor, '_key'))}`
    const secondKey = Reflect.get(paragraphs[1], lexicalKeyProperty)
    const rootKey = Reflect.get(root, lexicalKeyProperty)
    Reflect.deleteProperty(paragraphs[1], lexicalKeyProperty)
    Reflect.deleteProperty(root, lexicalKeyProperty)
    const detachedTransfer = createDataTransfer()
    menu.dispatchEvent(
      new TestDragEvent('dragstart', { bubbles: true, dataTransfer: detachedTransfer }),
    )
    expect(detachedTransfer.setData).not.toHaveBeenCalled()
    Reflect.set(paragraphs[1], lexicalKeyProperty, secondKey)
    Reflect.set(root, lexicalKeyProperty, rootKey)

    const transfer = createDataTransfer()
    menu.dispatchEvent(new TestDragEvent('dragstart', { bubbles: true, dataTransfer: transfer }))
    expect(transfer.setDragImage).toHaveBeenCalledWith(paragraphs[1], 0, 0)
    expect(transfer.setData).toHaveBeenCalledWith(
      'application/x-lexical-drag-block',
      expect.any(String),
    )

    const fileTransfer = createDataTransfer(['Files'])
    expect(
      editor.dispatchCommand(
        DRAGOVER_COMMAND,
        dragEvent('dragover', paragraphs[2], fileTransfer, 80),
      ),
    ).toBe(false)
    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[2], fileTransfer, 80)),
    ).toBe(false)

    const over = dragEvent('dragover', paragraphs[2], transfer, 80)
    expect(editor.dispatchCommand(DRAGOVER_COMMAND, over)).toBe(true)
    expect(over.defaultPrevented).toBe(true)
    expect(line.style.opacity).toBe('0.4')
    expect(line.style.width).toBe('352px')

    expect(
      editor.dispatchCommand(DRAGOVER_COMMAND, dragEvent('dragover', paragraphs[0], transfer, 35)),
    ).toBe(false)

    const invalidTransfer = createDataTransfer()
    invalidTransfer.setData('application/x-lexical-drag-block', 'missing')
    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[2], invalidTransfer, 80)),
    ).toBe(false)

    const thirdKey = Reflect.get(paragraphs[2], lexicalKeyProperty)
    Reflect.deleteProperty(paragraphs[2], lexicalKeyProperty)
    Reflect.deleteProperty(root, lexicalKeyProperty)
    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[2], transfer, 80)),
    ).toBe(false)
    Reflect.set(paragraphs[2], lexicalKeyProperty, thirdKey)
    Reflect.set(root, lexicalKeyProperty, rootKey)

    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[2], transfer, 80)),
    ).toBe(true)
    await flush()
    editor.read('latest', () => {
      expect(
        $getRoot()
          .getChildren()
          .map((node) => node.getTextContent()),
      ).toEqual(['one', 'three', 'two'])
    })

    expect(
      editor.dispatchCommand(DRAGOVER_COMMAND, dragEvent('dragover', paragraphs[2], transfer, 100)),
    ).toBe(true)
    expect(
      editor.dispatchCommand(DROP_COMMAND, dragEvent('drop', paragraphs[0], transfer, 5)),
    ).toBe(true)
    await flush()
    editor.read('latest', () => {
      expect(
        $getRoot()
          .getChildren()
          .map((node) => node.getTextContent()),
      ).toEqual(['two', 'one', 'three'])
    })
    expect(menu.style.opacity).toBe('0')
    expect(line.style.opacity).toBe('0')

    menu.dispatchEvent(new TestDragEvent('dragend', { bubbles: true }))
    root.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await flush()
    expect(changes.at(-1)).toBe(null)

    editor.setEditable(false)
    await flush()
    expect(anchor.querySelector('.drag-handle')).toBeNull()
    editor.setEditable(true)
    await flush()
    expect(anchor.querySelector('.drag-handle')).not.toBeNull()

    wrapper.unmount()
  })

  it('uses the editor container as its default anchor and handles an empty root', async () => {
    const anchor = document.createElement('section')
    document.body.append(anchor)
    const host = document.createElement('div')
    anchor.append(host)
    const anchorElement = ref<HTMLElement | null>(null)
    let editor: LexicalEditor | undefined
    const Capture = captureEditor((value) => {
      editor = value
    })
    const wrapper = mount(LexicalComposer, {
      attachTo: host,
      props: {
        initialConfig: {
          namespace: 'draggable-default-anchor',
          onError,
          editorState: null,
        },
      },
      slots: {
        default: () => [
          h(ContentEditable),
          h(DraggableBlockPlugin, { anchorElement: anchorElement.value }),
          h(Capture),
        ],
      },
    })

    await flush()
    const root = wrapper.get('[contenteditable]').element
    root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 10 }))
    await flush()
    expect(editor?.getEditorState().read(() => $getRoot().isEmpty())).toBe(true)

    anchorElement.value = anchor
    await flush()
    expect(anchor.querySelector('[draggable]')).not.toBeNull()
    wrapper.unmount()
  })
})
