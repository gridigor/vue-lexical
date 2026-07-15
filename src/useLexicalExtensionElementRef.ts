import type { ComponentPublicInstance, MaybeRefOrGetter } from 'vue'
import { isHTMLElement } from 'lexical'
import { shallowRef, toValue, watchEffect } from 'vue'

export type LexicalElementRef = (element: Element | ComponentPublicInstance | null) => void

export function useLexicalExtensionElementRef<Element extends HTMLElement>(
  register: (element: Element) => () => void,
): LexicalElementRef {
  const element = shallowRef<Element | null>(null)

  watchEffect(
    (onCleanup) => {
      const currentElement = element.value
      if (currentElement !== null) {
        onCleanup(register(currentElement))
      }
    },
    { flush: 'post' },
  )

  return (nextElement) => {
    element.value = isHTMLElement(nextElement) ? (nextElement as Element) : null
  }
}

export function resolveRefOption<Value>(option: MaybeRefOrGetter<Value>): Value {
  return toValue(option)
}
