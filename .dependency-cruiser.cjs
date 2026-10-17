/**
 * Dependency-direction rules (brief 4.3, spec 5.3). `pnpm check:boundaries` runs this over packages/, apps/ and tools/.
 * ESLint import restrictions (eslint.config.js) are the second net.
 *
 *   core  imports nothing from kb, llm, db, apps, tools; no Node built-ins; third-party only zod and @noble/hashes.
 *   kb    may import core.      llm may import core and kb.      db may import core.
 *   web   imports core only (never db, provider SDKs, server-only modules).
 *   The AI SDK and provider SDKs are imported only in packages/llm/src/adapters/.
 *   tools/ may import any package; nothing imports tools/.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
const NPM = ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'npm-unknown'];
const PACKAGE = (name) => `(^|/)node_modules/${name}(/|$)`;
const VENDOR_SDKS = '(ai|@ai-sdk/[^/]+|@openrouter/[^/]+|openai|@anthropic-ai/[^/]+|@google/[^/]+)';
const SERVER_ONLY = '(drizzle-orm|drizzle-kit|pg|postgres|hono|@hono/[^/]+)';
const CORE_SRC = { path: '^packages/core/src/', pathNot: ['\\.test\\.ts$', '^packages/core/src/test/'] };

module.exports = {
  forbidden: [
    {
      name: 'core-imports-nothing-internal',
      comment: 'packages/core imports nothing from kb, llm, db, tsconfig, apps or tools (brief 4.3 rule 1).',
      severity: 'error',
      from: { path: '^packages/core/' },
      to: { path: '^(packages/(kb|llm|db|tsconfig)|apps|tools)/' },
    },
    {
      name: 'core-no-node-builtins',
      comment: 'packages/core performs no I/O: no fs, http, crypto, process, ... (hard rule 3).',
      severity: 'error',
      from: CORE_SRC,
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'core-third-party-allow-list',
      comment: 'packages/core may use only zod and a pure-JS SHA-256 (@noble/hashes). Anything else needs an ADR.',
      severity: 'error',
      from: CORE_SRC,
      to: { dependencyTypes: NPM, pathNot: [PACKAGE('zod'), PACKAGE('@noble/hashes')] },
    },
    {
      name: 'kb-may-import-core-only',
      comment: 'packages/kb may import core (brief 4.3 rule 2).',
      severity: 'error',
      from: { path: '^packages/kb/' },
      to: { path: '^(packages/(llm|db)|apps|tools)/' },
    },
    {
      name: 'llm-may-import-core-and-kb',
      comment: 'packages/llm may import core and kb (brief 4.3 rule 2).',
      severity: 'error',
      from: { path: '^packages/llm/' },
      to: { path: '^(packages/db|apps|tools)/' },
    },
    {
      name: 'db-may-import-core-only',
      comment: 'packages/db may import core (brief 4.3 rule 2).',
      severity: 'error',
      from: { path: '^packages/db/' },
      to: { path: '^(packages/(kb|llm)|apps|tools)/' },
    },
    {
      name: 'web-imports-core-only',
      comment: 'apps/web imports core only: never kb, llm, db, api, worker, tools (brief 4.3 rule 3).',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: '^(packages/(kb|llm|db)|apps/(api|worker)|tools)/' },
    },
    {
      name: 'web-no-server-only-modules',
      comment: 'apps/web never imports Node built-ins, database drivers, server frameworks or provider SDKs.',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { dependencyTypes: ['core'] },
    },
    {
      name: 'web-no-server-packages',
      comment: 'apps/web never imports database drivers, server frameworks or provider SDKs.',
      severity: 'error',
      from: { path: '^apps/web/' },
      to: { path: [PACKAGE(SERVER_ONLY), PACKAGE(VENDOR_SDKS)] },
    },
    {
      name: 'api-does-not-import-other-apps',
      comment: 'Apps do not import other apps.',
      severity: 'error',
      from: { path: '^apps/api/' },
      to: { path: '^apps/(web|worker)/' },
    },
    {
      name: 'worker-does-not-import-other-apps',
      comment: 'Apps do not import other apps.',
      severity: 'error',
      from: { path: '^apps/worker/' },
      to: { path: '^apps/(web|api)/' },
    },
    {
      name: 'vendor-sdks-only-in-llm-adapters',
      comment:
        'Feature code never calls a vendor SDK. Only packages/llm/src/adapters/ imports the AI SDK and provider SDKs (brief 4.3 rule 4).',
      severity: 'error',
      from: { pathNot: ['^packages/llm/src/adapters/', '^tools/'] },
      to: { path: PACKAGE(VENDOR_SDKS) },
    },
    {
      name: 'nothing-imports-tools',
      comment: 'tools/ may import any package; no package or app imports tools/ (brief 4.3 rule 5).',
      severity: 'error',
      from: { path: '^(packages|apps)/' },
      to: { path: '^tools/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    },
    exclude: { path: ['(^|/)dist/', '(^|/)coverage/'] },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
