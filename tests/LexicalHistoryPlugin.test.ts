import { createEmptyHistoryState, type HistoryState } from '../src/LexicalHistoryPlugin'
import { describe, expect, it } from 'vitest'

describe('LexicalHistoryPlugin public API', () => {
  it('creates an empty external history state', () => {
    const historyState: HistoryState = createEmptyHistoryState()

    expect(historyState).toEqual({
      current: null,
      redoStack: [],
      undoStack: [],
    })
  })
})
