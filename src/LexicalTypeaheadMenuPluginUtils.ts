import { getScrollParent as getScrollParentFromUtils } from '@lexical/utils'
import { createCommand, type LexicalCommand } from 'lexical'
import { MenuOption } from './LexicalMenuOption'
import type { TriggerFn } from './menu/LexicalMenu'

/** Default punctuation character class that terminates a typeahead query. */
export const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;'

export interface BasicTypeaheadTriggerOptions {
  allowWhitespace?: boolean
  maxLength?: number
  minLength?: number
  punctuation?: string
}

/** Scrolls the option at the given index into view while the menu is open. */
export const SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND: LexicalCommand<{
  index: number
  option: MenuOption
}> = createCommand('SCROLL_TYPEAHEAD_OPTION_INTO_VIEW_COMMAND')

/** Builds a trigger function for a single-character trigger such as @ or #. */
export function createBasicTypeaheadTriggerMatch(
  trigger: string,
  {
    allowWhitespace = false,
    maxLength = 75,
    minLength = 1,
    punctuation = PUNCTUATION,
  }: BasicTypeaheadTriggerOptions = {},
): TriggerFn {
  const validCharacters = `[^${trigger}${punctuation}${allowWhitespace ? '' : '\\s'}]`
  const expression = new RegExp(
    `(^|\\s|\\()([${trigger}]((?:${validCharacters}){0,${maxLength}}))$`,
  )

  return (text) => {
    const match = expression.exec(text)
    if (match === null) {
      return null
    }
    const leadingText = match[1] ?? ''
    const matchingString = match[3] ?? ''
    if (matchingString.length < minLength) {
      return null
    }
    return {
      leadOffset: match.index + leadingText.length,
      matchingString,
      replaceableString: match[2] ?? '',
    }
  }
}

/** Vue-compatible alias matching the upstream composable name. */
export const useBasicTypeaheadTriggerMatch = createBasicTypeaheadTriggerMatch

/** @deprecated Import getScrollParent from @lexical/utils instead. */
export const getScrollParent = getScrollParentFromUtils
