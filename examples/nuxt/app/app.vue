<template>
  <main class="page-shell">
    <section class="intro">
      <p class="eyebrow">Interactive component showcase</p>
      <h1>Vue Lexical demo playground</h1>
      <p>
        This demonstration playground showcases the editor features currently available in
        @gridigor/vue-lexical. The page is server-rendered by Nuxt, then Lexical connects the editor
        state and interactive plugins during hydration.
      </p>
    </section>

    <LexicalEditor />
    <LexicalCollaborationPlayground />
  </main>
</template>
