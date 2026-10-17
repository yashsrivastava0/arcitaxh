# packages/tsconfig

Purpose: shared TypeScript presets (`node.json`, `browser.json`) extending the root `tsconfig.base.json`. Config only; no code.

- Keep `strict: true`. Do not loosen a flag in a preset to make one package compile; fix the package.
- A preset change affects every package: run `pnpm typecheck` at the root before committing.
