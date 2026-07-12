import type { PropType, WatchStopHandle } from 'vue'
import { defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { registerCharacterLimit } from './useCharacterLimit'

export type CharacterLimitCharset = 'UTF-8' | 'UTF-16'

export interface CharacterLimitSlotProps {
  exceeded: boolean
  remainingCharacters: number
}

let textEncoder: TextEncoder | undefined

function utf8Length(text: string): number {
  if (typeof TextEncoder === 'function') {
    textEncoder ??= new TextEncoder()
    return textEncoder.encode(text).length
  }

  const continuationBytes = encodeURIComponent(text).match(/%[89ABab]/g)
  return text.length + (continuationBytes?.length ?? 0)
}

export const CharacterLimitPlugin = defineComponent({
  name: 'LexicalCharacterLimitPlugin',
  props: {
    charset: {
      type: String as PropType<CharacterLimitCharset>,
      default: 'UTF-16',
      validator: (value: string) => value === 'UTF-8' || value === 'UTF-16',
    },
    maxLength: {
      type: Number,
      default: 5,
    },
  },
  setup(props, { slots }) {
    const editor = useLexicalComposer()
    const remainingCharacters = ref(props.maxLength)
    let stopWatching: WatchStopHandle | undefined

    onMounted(() => {
      stopWatching = watch(
        () => [props.maxLength, props.charset] as const,
        ([maxLength, charset], _previous, onCleanup) => {
          remainingCharacters.value = maxLength
          onCleanup(
            registerCharacterLimit(editor, maxLength, {
              remainingCharacters: (remaining) => {
                remainingCharacters.value = remaining
              },
              strlen: charset === 'UTF-8' ? utf8Length : (text) => text.length,
            }),
          )
        },
        { immediate: true },
      )
    })
    onUnmounted(() => stopWatching?.())

    return () => {
      const slotProps: CharacterLimitSlotProps = {
        exceeded: remainingCharacters.value < 0,
        remainingCharacters: remainingCharacters.value,
      }
      return (
        slots.default?.(slotProps) ??
        h(
          'span',
          {
            class: ['characters-limit', { 'characters-limit-exceeded': slotProps.exceeded }],
          },
          String(slotProps.remainingCharacters),
        )
      )
    }
  },
})

export { CharacterLimitPlugin as LexicalCharacterLimitPlugin }
export default CharacterLimitPlugin
