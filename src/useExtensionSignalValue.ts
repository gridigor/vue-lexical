import type { ReadonlySignal } from '@lexical/extension'
import type { AnyLexicalExtension, LexicalExtensionOutput } from 'lexical'
import type { ShallowRef } from 'vue'
import { onScopeDispose, shallowReadonly, shallowRef } from 'vue'
import { useExtensionDependency } from './useExtensionComponent'

export type SignalValue<Signal> = Signal extends ReadonlySignal<infer Value> ? Value : never

export function useSignalValue<Value>(signal: ReadonlySignal<Value>): Readonly<ShallowRef<Value>> {
  const value = shallowRef(signal.peek()) as ShallowRef<Value>
  const unsubscribe = signal.subscribe((nextValue) => {
    value.value = nextValue
  })
  onScopeDispose(unsubscribe)
  return shallowReadonly(value)
}

export function useExtensionSignalValue<
  Extension extends AnyLexicalExtension,
  Key extends keyof LexicalExtensionOutput<Extension>,
>(
  extension: Extension,
  property: Key,
): Readonly<ShallowRef<SignalValue<LexicalExtensionOutput<Extension>[Key]>>> {
  const signal = useExtensionDependency(extension).output[property] as ReadonlySignal<
    SignalValue<LexicalExtensionOutput<Extension>[Key]>
  >
  return useSignalValue(signal)
}
