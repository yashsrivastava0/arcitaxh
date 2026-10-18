import { builtinModules } from 'node:module';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Dependency direction (brief 4.3). dependency-cruiser is the primary enforcement (pnpm check:boundaries);
// these import restrictions are the second net, and they also enforce core purity (hard rule 3).
// Every Node built-in module, including subpaths such as fs/promises and path/posix, read from Node itself so the list
// can never be incomplete. "node:"-prefixed specifiers are covered by a pattern.
const NODE_BUILTINS = [...new Set(builtinModules.filter((name) => !name.startsWith('_') && !name.startsWith('node:')))];
const nodeBuiltinPaths = (message) => NODE_BUILTINS.map((name) => ({ name, message }));
const CORE_IO = 'packages/core performs no I/O (hard rule 3).';

const restrict = (patterns, paths = []) => ({
  'no-restricted-imports': ['error', { patterns, paths }],
});

const forbidden = (names, why) => names.map((group) => ({ group: [group], message: why }));
const OTHER_PACKAGES = [
  '@product/kb',
  '@product/llm',
  '@product/db',
  '@product/api',
  '@product/web',
  '@product/worker',
];
const TOOLS = ['@product/tool-*', '**/tools/**'];
const VENDOR_SDKS = ['ai', '@ai-sdk/*', '@openrouter/*', 'openai', '@anthropic-ai/*', '@google/*'];

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/coverage/**', 'kb/schema/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      eqeqeq: ['error', 'always'],
    },
  },
  // ---- packages/core: pure. No I/O, no clock, no randomness, no environment (hard rule 3). ----
  {
    files: ['packages/core/src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
    ignores: ['**/*.test.{ts,tsx,mts,cts,js,mjs,cjs}', 'packages/core/src/test/**'],
    rules: {
      ...restrict(
        [
          { group: ['node:*'], message: CORE_IO },
          ...forbidden(OTHER_PACKAGES, 'core imports nothing from other packages or apps (brief 4.3).'),
          ...forbidden(TOOLS, 'Nothing imports tools/.'),
          ...forbidden(VENDOR_SDKS, 'Only adapters call vendor SDKs.'),
          ...forbidden(
            ['hono', 'react', 'react-dom', 'drizzle-orm', 'pg', 'postgres'],
            'core has no framework or database dependency.',
          ),
          // @noble/hashes: only the two entry points core uses. Its other entry points reach WebCrypto/randomness.
          {
            group: ['@noble/hashes/*', '!@noble/hashes/sha2.js', '!@noble/hashes/utils.js'],
            message: 'core may import only @noble/hashes/sha2.js and @noble/hashes/utils.js (pure hashing).',
          },
        ],
        [
          ...nodeBuiltinPaths(CORE_IO),
          {
            // The bare package entry re-exports everything (including randomness). A gitignore-style pattern cannot
            // exclude a parent and re-include its children, so the bare name is a path restriction.
            name: '@noble/hashes',
            message: 'core may import only @noble/hashes/sha2.js and @noble/hashes/utils.js (pure hashing).',
          },
          {
            // utils.js also exports randomBytes, nextTick and asyncLoop: allow only the pure helpers.
            name: '@noble/hashes/utils.js',
            allowImportNames: ['bytesToHex', 'utf8ToBytes'],
            message: 'core may use only bytesToHex and utf8ToBytes from @noble/hashes/utils.js (no randomness).',
          },
        ],
      ),
      'no-restricted-globals': [
        'error',
        ...[
          'process',
          'fetch',
          'setTimeout',
          'setInterval',
          'clearTimeout',
          'clearInterval',
          'queueMicrotask',
          'XMLHttpRequest',
          'localStorage',
          'sessionStorage',
          'require',
          'Buffer',
          'performance',
          'crypto',
          'console',
          'globalThis',
          'global',
          'self',
          'window',
          'document',
          'navigator',
          'Intl',
        ].map((name) => ({
          name,
          message: 'Not allowed in packages/core: it performs no I/O and is deterministic (hard rule 3).',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Take time from the Clock port.' },
        { object: 'Math', property: 'random', message: 'No randomness in core. Ids come from the IdGenerator port.' },
        { object: 'performance', property: 'now', message: 'Take time from the Clock port.' },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() reads the clock. Take time from the Clock port.',
        },
        {
          selector: "NewExpression[callee.name='Date'] > SpreadElement",
          message: 'new Date(...args) can read the clock. Pass explicit arguments.',
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: 'Date() reads the clock. Take time from the Clock port.',
        },
        {
          selector: "VariableDeclarator[init.name='Date'], AssignmentExpression[right.name='Date']",
          message: 'Do not alias Date: it hides clock reads from review. Use new Date(arg) or Date.UTC directly.',
        },
        {
          selector: "VariableDeclarator[init.name='Math'], AssignmentExpression[right.name='Math']",
          message: 'Do not alias or destructure Math: it hides Math.random from review.',
        },
        {
          selector:
            'CallExpression[callee.property.name=/^toLocale/], CallExpression[callee.property.name="localeCompare"]',
          message: 'Locale-dependent behaviour is not reproducible. Use compareStrings for ordering.',
        },
        {
          selector: 'ImportExpression',
          message: 'No dynamic import() in core: imports must be static and reviewable.',
        },
      ],
    },
  },
  // ---- packages/kb: may import core only. ----
  {
    files: ['packages/kb/src/**/*.ts'],
    rules: restrict([
      ...forbidden(
        ['@product/llm', '@product/db', '@product/api', '@product/web', '@product/worker'],
        'kb may import core only (brief 4.3).',
      ),
      ...forbidden(TOOLS, 'Nothing imports tools/.'),
      ...forbidden(VENDOR_SDKS, 'Only adapters call vendor SDKs.'),
    ]),
  },
  // ---- packages/llm: core and kb only; the AI SDK only inside src/adapters. ----
  {
    files: ['packages/llm/src/**/*.ts'],
    ignores: ['packages/llm/src/adapters/**'],
    rules: restrict([
      ...forbidden(
        ['@product/db', '@product/api', '@product/web', '@product/worker'],
        'llm may import core and kb only (brief 4.3).',
      ),
      ...forbidden(TOOLS, 'Nothing imports tools/.'),
      ...forbidden(
        VENDOR_SDKS,
        'The AI SDK and provider SDKs are imported only in packages/llm/src/adapters/ (brief 4.3 rule 4).',
      ),
    ]),
  },
  {
    files: ['packages/llm/src/adapters/**/*.ts'],
    rules: restrict([
      ...forbidden(
        ['@product/db', '@product/api', '@product/web', '@product/worker'],
        'llm may import core and kb only (brief 4.3).',
      ),
      ...forbidden(TOOLS, 'Nothing imports tools/.'),
    ]),
  },
  // ---- packages/db: core only. ----
  {
    files: ['packages/db/src/**/*.ts'],
    rules: restrict([
      ...forbidden(
        ['@product/kb', '@product/llm', '@product/api', '@product/web', '@product/worker'],
        'db may import core only (brief 4.3).',
      ),
      ...forbidden(TOOLS, 'Nothing imports tools/.'),
      ...forbidden(VENDOR_SDKS, 'Only adapters call vendor SDKs.'),
    ]),
  },
  // ---- apps/web: core only, no server-only modules, no provider SDKs. ----
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: restrict(
      [
        { group: ['node:*'], message: 'The web app never imports server-only modules.' },
        ...forbidden(
          ['@product/kb', '@product/llm', '@product/db', '@product/api', '@product/worker'],
          'web imports core only (brief 4.3 rule 3).',
        ),
        ...forbidden(TOOLS, 'Nothing imports tools/.'),
        ...forbidden(VENDOR_SDKS, 'The web app never imports provider SDKs.'),
        ...forbidden(
          ['drizzle-orm', 'drizzle-orm/*', 'pg', 'postgres', 'hono', 'hono/*'],
          'The web app never imports server-only modules.',
        ),
      ],
      nodeBuiltinPaths('The web app never imports server-only modules.'),
    ),
  },
  // ---- apps/api: core, kb, llm, db. Not web, not tools. ----
  {
    files: ['apps/api/src/**/*.ts'],
    rules: restrict([
      ...forbidden(['@product/web', '@product/worker'], 'api does not import other apps.'),
      ...forbidden(TOOLS, 'Nothing imports tools/.'),
      ...forbidden(VENDOR_SDKS, 'Only adapters in packages/llm call vendor SDKs.'),
    ]),
  },
  // ---- plain Node scripts at the repo root ----
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { sourceType: 'module' },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { module: 'writable', require: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
