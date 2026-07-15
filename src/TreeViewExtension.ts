import type { LexicalExtension, LexicalExtensionConfig } from 'lexical'
import type { Component, PropType } from 'vue'
import { defineExtension } from 'lexical'
import { defineComponent, h } from 'vue'
import { useLexicalComposer } from './LexicalComposerContext'
import { TreeView, type CustomPrintNodeFn } from './LexicalTreeView'
import { VueExtension } from './VueExtension'
import { useExtensionDependency } from './useExtensionComponent'

export interface TreeViewConfig {
  treeTypeButtonClassName?: string
  timeTravelButtonClassName?: string
  timeTravelPanelButtonClassName?: string
  timeTravelPanelClassName?: string
  timeTravelPanelSliderClassName?: string
  viewClassName?: string
  customPrintNode?: CustomPrintNodeFn
}

export const TreeViewExtensionComponent: Component = defineComponent({
  name: 'TreeViewExtensionComponent',
  props: {
    treeTypeButtonClassName: {
      type: String,
      default: undefined,
    },
    timeTravelButtonClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelButtonClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelClassName: {
      type: String,
      default: undefined,
    },
    timeTravelPanelSliderClassName: {
      type: String,
      default: undefined,
    },
    viewClassName: {
      type: String,
      default: undefined,
    },
    customPrintNode: {
      type: Function as PropType<CustomPrintNodeFn>,
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
        ...(props.timeTravelButtonClassName === undefined
          ? {}
          : { timeTravelButtonClassName: props.timeTravelButtonClassName }),
        ...(props.timeTravelPanelButtonClassName === undefined
          ? {}
          : { timeTravelPanelButtonClassName: props.timeTravelPanelButtonClassName }),
        ...(props.timeTravelPanelClassName === undefined
          ? {}
          : { timeTravelPanelClassName: props.timeTravelPanelClassName }),
        ...(props.timeTravelPanelSliderClassName === undefined
          ? {}
          : { timeTravelPanelSliderClassName: props.timeTravelPanelSliderClassName }),
        ...(props.viewClassName === undefined ? {} : { viewClassName: props.viewClassName }),
        ...(props.customPrintNode === undefined ? {} : { customPrintNode: props.customPrintNode }),
        editor,
      })
  },
})

const config: TreeViewConfig = {
  treeTypeButtonClassName: 'debug-treetype-button',
  timeTravelButtonClassName: 'debug-timetravel-button',
  timeTravelPanelButtonClassName: 'debug-timetravel-panel-button',
  timeTravelPanelClassName: 'debug-timetravel-panel',
  timeTravelPanelSliderClassName: 'debug-timetravel-panel-slider',
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
