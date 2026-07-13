import type {
  ElementFormatType,
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'
import type { VNodeChild } from 'vue'
import { $getDocument, DecoratorNode } from 'lexical'

export type SerializedDecoratorBlockNode = Spread<
  { format: ElementFormatType },
  SerializedLexicalNode
>

/** Base node for block-level Vue decorators with element alignment. */
export abstract class DecoratorBlockNode extends DecoratorNode<VNodeChild> {
  __format: ElementFormatType

  constructor(format?: ElementFormatType, key?: NodeKey) {
    super(key)
    this.__format = format ?? ''
  }

  afterCloneFrom(previousNode: this): void {
    super.afterCloneFrom(previousNode)
    this.__format = previousNode.__format
  }

  exportJSON(): SerializedDecoratorBlockNode {
    return {
      ...super.exportJSON(),
      format: this.__format,
    }
  }

  updateFromJSON(serializedNode: LexicalUpdateJSON<SerializedDecoratorBlockNode>): this {
    return super.updateFromJSON(serializedNode).setFormat(serializedNode.format ?? '')
  }

  canIndent(): false {
    return false
  }

  createDOM(): HTMLElement {
    return $getDocument().createElement('div')
  }

  updateDOM(): false {
    return false
  }

  setFormat(format: ElementFormatType): this {
    this.getWritable().__format = format
    return this
  }

  getFormat(): ElementFormatType {
    return this.getLatest().__format
  }

  isInline(): false {
    return false
  }
}

export function $isDecoratorBlockNode(
  node: LexicalNode | null | undefined,
): node is DecoratorBlockNode {
  return node instanceof DecoratorBlockNode
}
