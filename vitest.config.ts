import { defineConfig } from 'vitest/config';

// One Node project for packages, tools and apps. The web app gets its own jsdom project in M9.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'tools/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
