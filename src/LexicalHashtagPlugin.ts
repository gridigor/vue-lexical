import { HashtagNode, registerLexicalHashtag } from '@lexical/hashtag'
import { defineComponent, onMounted, onUnmounted } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'

/** Transforms hashtag text into HashtagNode instances. */
export const HashtagPlugin = defineComponent({
  name: 'LexicalHashtagPlugin',
  setup() {
    const editor = useLexicalComposer()
    let unregister: (() => void) | undefined

    onMounted(() => {
      if (!editor.hasNodes([HashtagNode])) {
        throw new Error('LexicalHashtagPlugin: HashtagNode not registered on editor')
      }

      unregister = registerLexicalHashtag(editor)
    })
    onUnmounted(() => unregister?.())

    return () => null
  },
})

export { registerLexicalHashtag, type HashtagConfig } from '@lexical/hashtag'
export { HashtagPlugin as LexicalHashtagPlugin }
export default HashtagPlugin
