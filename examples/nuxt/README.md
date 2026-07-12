# Nuxt SSR example

This app exercises the built `@gridigor/vue-lexical` package through Nuxt
server rendering and client hydration. The local `file:` dependency resolves
the same package entry points used by npm consumers instead of aliasing imports
to the repository source.

Build the package from the repository root first:

```sh
npm run build
```

From this directory:

```sh
npm install
npm run dev
```

Use `npm run typecheck` to check Vue SFCs with TypeScript 7 through
`vue-tsgo`, and `npm run build` to verify package entry points and the
production SSR bundle.
