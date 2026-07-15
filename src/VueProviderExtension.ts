import { defineExtension } from 'lexical'

/**
 * Declares that an extension-built editor has a Vue component host available.
 * Vue-dependent extensions can use this as a peer dependency without importing
 * any component implementation.
 */
export const VueProviderExtension = defineExtension({
  name: '@gridigor/vue-lexical/VueProvider',
})
