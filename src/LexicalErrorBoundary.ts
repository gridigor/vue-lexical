import type { ComponentPublicInstance } from 'vue'
import { defineComponent, h, onErrorCaptured, shallowRef } from 'vue'

export interface LexicalErrorBoundarySlotProps {
  error: Error
  errorInfo: string
  reset: () => void
}

/** Vue listener props for LexicalErrorBoundary; content and fallback use slots. */
export interface LexicalErrorBoundaryProps {
  onError?: (error: Error, errorInfo: string, instance: ComponentPublicInstance | null) => void
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error), { cause: error })
}

export const LexicalErrorBoundary = defineComponent({
  name: 'LexicalErrorBoundary',
  emits: {
    error: (_error: Error, _errorInfo: string, _instance: ComponentPublicInstance | null) => true,
  },
  setup(_props, { emit, slots }) {
    const capturedError = shallowRef<Error>()
    const capturedErrorInfo = shallowRef('')

    const reset = () => {
      capturedError.value = undefined
      capturedErrorInfo.value = ''
    }

    onErrorCaptured((error, instance, errorInfo) => {
      const normalizedError = normalizeError(error)
      capturedError.value = normalizedError
      capturedErrorInfo.value = errorInfo
      emit('error', normalizedError, errorInfo, instance)

      return false
    })

    return () => {
      const error = capturedError.value

      if (error === undefined) {
        return slots.default?.()
      }

      const slotProps: LexicalErrorBoundarySlotProps = {
        error,
        errorInfo: capturedErrorInfo.value,
        reset,
      }

      return (
        slots.fallback?.(slotProps) ??
        h(
          'div',
          {
            role: 'alert',
            style: {
              border: '1px solid #f00',
              color: '#f00',
              padding: '8px',
            },
          },
          'An error was thrown.',
        )
      )
    }
  },
})

export default LexicalErrorBoundary
