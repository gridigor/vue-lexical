import type {
  ElementFormatType,
  LexicalNode,
  LexicalParseJSON,
  NodeKey,
  SerializedLexicalNode,
  SerializedPartial,
  Spread,
} from 'lexical'
import type { VNodeChild } from 'vue'
import { $getDocument, DecoratorNode, enumValue, nodeSchema, withField } from 'lexical'

export type SerializedDecoratorBlockNode = Spread<
  { format: ElementFormatType },
  SerializedLexicalNode
>

// Single source of truth for the node-specific properties of a
// SerializedDecoratorBlockNode. The base is abstract and has no concrete node
// type, so it publishes the schema under the well-known
// Symbol.for('DecoratorBlockNode') key and subclasses compose it with theirs.
const decoratorBlockNodeSchema = nodeSchema<DecoratorBlockNode>()({
  format: withField(enumValue(['', 'left', 'start', 'center', 'right', 'end', 'justify']), {
    field: '__format',
  }),
})

export interface DecoratorBlockNode {
  exportJSON(compact?: false): SerializedDecoratorBlockNode
  exportJSON(compact: boolean): SerializedPartial<SerializedDecoratorBlockNode>
  updateFromJSON(serializedNode: LexicalParseJSON<SerializedDecoratorBlockNode>): this
}

/** Base node for block-level Vue decorators with element alignment. */
export abstract class DecoratorBlockNode extends DecoratorNode<VNodeChild> {
  __format: ElementFormatType

  constructor(format?: ElementFormatType, key?: NodeKey) {
    super(key)
    this.__format = format ?? ''
  }

  $config() {
    // Named explicitly: this class carries the only declaration of `format`
    // that its subclasses inherit, and composeSchema honours an explicit
    // `extends` where a severed static prototype chain would stop the walk.
    return this.config(Symbol.for('DecoratorBlockNode'), {
      extends: DecoratorNode,
      json: decoratorBlockNodeSchema,
    })
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
    const self = this.getWritable()
    self.__format = format
    return self
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
