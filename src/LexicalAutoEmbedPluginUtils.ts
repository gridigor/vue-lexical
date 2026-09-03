import { createCommand, type LexicalCommand, type LexicalEditor, type LexicalNode } from 'lexical'
import { MenuOption } from './LexicalMenuOption'

/** The result of matching a URL for an embed. */
export interface EmbedMatchResult<TData = unknown> {
  data?: TData
  id: string
  url: string
}

/** Describes a kind of embed that AutoEmbedPlugin can detect and insert. */
export interface EmbedConfig<
  TData = unknown,
  TResult extends EmbedMatchResult<TData> = EmbedMatchResult<TData>,
> {
  insertNode: (editor: LexicalEditor, result: TResult) => void
  parseUrl: (text: string) => Promise<TResult | null> | TResult | null
  type: string
}

/** General-purpose URL expression, a convenience for implementing parseUrl. */
export const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/

/** Starts inserting an embed; the payload is the EmbedConfig type to use. */
export const INSERT_EMBED_COMMAND: LexicalCommand<EmbedConfig['type']> =
  createCommand('INSERT_EMBED_COMMAND')

/** A menu option pairing a display title with an embed callback. */
export class AutoEmbedOption extends MenuOption {
  declare title: string
  onSelect: (targetNode: LexicalNode | null) => void

  constructor(title: string, options: { onSelect: (targetNode: LexicalNode | null) => void }) {
    super(title)
    this.title = title
    this.onSelect = options.onSelect.bind(this)
  }
}
