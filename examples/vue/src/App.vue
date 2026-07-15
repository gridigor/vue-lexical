<script setup lang="ts">
import { h } from 'vue'
import {
  ContentEditable,
  ExtensionComponent,
  LexicalExtensionComposer,
  TreeViewExtension,
} from '@gridigor/vue-lexical'
import EditorToolbar from './EditorToolbar.vue'
import { CharacterCountExtension, PlaygroundExtension } from './editorExtension'

const renderContentEditable = () =>
  h(
    'div',
    { class: 'editor-surface' },
    h(
      ContentEditable,
      {
        'aria-label': 'Extension-based rich text editor',
        class: 'editor-input',
      },
      {
        placeholder: () => h('span', 'Start writing…'),
      },
    ),
  )
</script>

<template>
  <main class="page-shell">
    <header class="intro">
      <p class="eyebrow">Vue SPA example</p>
      <h1>Extension API playground</h1>
      <p>
        This client-rendered playground builds the editor from Lexical extensions and hosts their
        Vue components and reactive signals through @gridigor/vue-lexical.
      </p>
    </header>

    <section class="editor-card" aria-labelledby="editor-title">
      <div class="editor-heading">
        <div>
          <span class="editor-kicker">defineExtension()</span>
          <h2 id="editor-title">Composable rich-text editor</h2>
        </div>
        <span class="extension-badge">Extension powered</span>
      </div>

      <LexicalExtensionComposer
        :extension="PlaygroundExtension"
        :content-editable="renderContentEditable"
      >
        <EditorToolbar />
        <ExtensionComponent :extension="CharacterCountExtension" />

        <details class="debug-panel">
          <summary>Inspect the Lexical tree</summary>
          <ExtensionComponent
            :extension="TreeViewExtension"
            time-travel-button-class-name="tree-time-travel"
            time-travel-panel-button-class-name="tree-time-travel-action"
            time-travel-panel-class-name="tree-time-travel-panel"
            time-travel-panel-slider-class-name="tree-time-travel-slider"
            tree-type-button-class-name="tree-toggle"
            view-class-name="tree-view"
          />
        </details>
      </LexicalExtensionComposer>
    </section>

    <p class="example-note">
      The Nuxt example remains the SSR and hydration playground. This Vite application verifies the
      standalone Vue SPA and Extension API path.
    </p>
  </main>
</template>
