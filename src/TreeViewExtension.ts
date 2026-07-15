import type { LexicalExtension, LexicalExtensionConfig } from 'lexical'
import type { Component } from 'vue'
import { defineExtension } from 'lexical'
import { defineComponent, h } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { TreeView } from './LexicalTreeView'
import { VueExtension } from './VueExtension'
import { useExtensionDependency } from './useExtensionComponent'

export interface TreeViewConfig {
  treeTypeButtonClassName?: string
  viewClassName?: string
}

export const TreeViewExtensionComponent: Component = defineComponent({
  name: 'TreeViewExtensionComponent',
  props: {
    treeTypeButtonClassName: {
      type: String,
      default: undefined,
    },
    viewClassName: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    const editor = useLexicalComposer()
    const dependency = useExtensionDependency(TreeViewExtension)

    return () =>
      h(TreeView, {
        ...dependency.config,
        ...(props.treeTypeButtonClassName === undefined
          ? {}
          : { treeTypeButtonClassName: props.treeTypeButtonClassName }),
        ...(props.viewClassName === undefined ? {} : { viewClassName: props.viewClassName }),
        editor,
      })
  },
})

const config: TreeViewConfig = {
  treeTypeButtonClassName: 'debug-tree-type-button',
  viewClassName: 'tree-view-output',
}

const treeViewExtensionName = '@gridigor/vue-lexical/TreeView' as const

export const TreeViewExtension = defineExtension({
  build: () => ({ Component: TreeViewExtensionComponent }),
  config,
  dependencies: [VueExtension],
  name: treeViewExtensionName,
}) as unknown as LexicalExtension<
  TreeViewConfig,
  typeof treeViewExtensionName,
  { Component: Component },
  undefined
>

export type ResolvedTreeViewConfig = LexicalExtensionConfig<typeof TreeViewExtension>
