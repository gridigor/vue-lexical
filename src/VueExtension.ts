import type { LexicalEditor } from 'lexical'
import type { Component, PropType, VNodeChild } from 'vue'
import {
  configExtension,
  declarePeerDependency,
  defineExtension,
  shallowMergeConfig,
} from 'lexical'
import { Fragment, defineComponent, h, provide } from 'vue'
import {
  createLexicalComposerContext,
  lexicalComposerContextKey,
  type LexicalComposerContext,
} from './LexicalComposerContext'
import { ContentEditable } from './LexicalContentEditable'
import { LexicalDecorators } from './LexicalDecorators'
import { LexicalErrorBoundary } from './LexicalErrorBoundary'
import { VueProviderExtension } from './VueProviderExtension'

export interface EditorChildrenComponentProps {
  children: VNodeChild
  contentEditable: VNodeChild
}

export type EditorChildrenComponent = (props: EditorChildrenComponentProps) => VNodeChild
export type VueExtensionDecorator = Component
export type VueExtensionContentEditable = (() => VNodeChild) | null

export interface VueConfig {
  EditorChildrenComponent: EditorChildrenComponent
  ErrorBoundary: Component
  contentEditable: VueExtensionContentEditable
  decorators: readonly VueExtensionDecorator[]
}

export interface VueOutputs {
  Component: Component
  context: LexicalComposerContext
}

export function DefaultEditorChildrenComponent({
  children,
  contentEditable,
}: EditorChildrenComponentProps): VNodeChild {
  return h(Fragment, null, [contentEditable, children])
}

function buildEditorComponent(
  editor: LexicalEditor,
  config: VueConfig,
  context: LexicalComposerContext,
): Component {
  return defineComponent({
    name: 'LexicalExtensionEditorHost',
    props: {
      contentEditable: {
        type: Function as unknown as PropType<VueExtensionContentEditable>,
        default: undefined,
      },
    },
    setup(props, { slots }) {
      provide(lexicalComposerContextKey, context)

      return () => {
        const contentEditableFactory =
          props.contentEditable === undefined ? config.contentEditable : props.contentEditable
        const contentEditable = contentEditableFactory?.() ?? null
        const children = slots.default?.()
        const editorChildren = config.EditorChildrenComponent({ children, contentEditable })
        const decorators = config.decorators.map((Decorator, index) =>
          h(Decorator, { key: `extension-decorator-${index}` }),
        )

        return h(
          config.ErrorBoundary,
          {
            onError(error: Error) {
              editor._onError(error)
            },
          },
          {
            default: () => [editorChildren, ...decorators, h(LexicalDecorators)],
          },
        )
      }
    },
  })
}

const initialConfig: VueConfig = {
  EditorChildrenComponent: DefaultEditorChildrenComponent,
  ErrorBoundary: LexicalErrorBoundary,
  contentEditable: () => h(ContentEditable),
  decorators: [],
}

/** Vue component integration used by extension-built Lexical editors. */
export const VueExtension = defineExtension({
  build(editor, config, state): VueOutputs {
    const provider = state.getPeer<typeof VueProviderExtension>(VueProviderExtension.name)
    if (provider === undefined) {
      throw new Error(
        `No VueProviderExtension detected. Vue-dependent extensions: ${[
          ...state.getDirectDependentNames(),
        ].join(' ')}`,
      )
    }

    const context: LexicalComposerContext = [
      editor,
      createLexicalComposerContext(null, editor._config.theme),
    ]
    return {
      Component: buildEditorComponent(editor, config, context),
      context,
    }
  },
  config: initialConfig,
  mergeConfig(previous, overrides) {
    const config = shallowMergeConfig(previous, overrides)
    if (overrides.decorators !== undefined) {
      config.decorators =
        overrides.decorators.length > 0
          ? [...previous.decorators, ...overrides.decorators]
          : previous.decorators
    }
    return config
  },
  name: '@gridigor/vue-lexical/Vue',
  peerDependencies: [declarePeerDependency<typeof VueProviderExtension>(VueProviderExtension.name)],
})

export function configureVueExtension(config: Partial<VueConfig>) {
  return configExtension(VueExtension, config)
}
