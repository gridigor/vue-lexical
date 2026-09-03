import type { PropType } from 'vue'
import { defineComponent, provide, shallowReactive } from 'vue'
import {
  collaborationContextKey,
  createCollaborationContext,
  type CollaborationContext,
} from './LexicalCollaborationContextUtils'

export {
  collaborationContextKey,
  createCollaborationContext,
  useCollaborationContext,
  type CollaborationContext,
  type CollaborationContextType,
} from './LexicalCollaborationContextUtils'

export const LexicalCollaboration = defineComponent({
  name: 'LexicalCollaboration',
  props: {
    context: {
      type: Object as PropType<CollaborationContext>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provide(
      collaborationContextKey,
      props.context === undefined ? createCollaborationContext() : shallowReactive(props.context),
    )

    return () => slots.default?.()
  },
})

export default LexicalCollaboration
