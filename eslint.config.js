import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Dependency direction (brief 4.3). dependency-cruiser is the primary enforcement (pnpm check:boundaries);
// these import restrictions are the second net, and they also enforce core purity (hard rule 3).
const NODE_BUILTINS = [
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'events', 'fs', 'http', 'http2', 'https',
  'net', 'os', 'path', 'perf_hooks', 'process', 'readline', 'stream', 'timers', 'tls', 'url', 'util', 'vm', 'worker_threads', 'zlib',
]; // prettier-ignore
const nodeBuiltinPaths = NODE_BUILTINS.map((name) => ({
  name,
  message: 'packages/core performs no I/O (hard rule 3).',
}));

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
    files: ['packages/core/src/**/*.ts'],
    ignores: ['**/*.test.ts', 'packages/core/src/test/**'],
    rules: {
      ...restrict(
        [
          { group: ['node:*'], message: 'packages/core performs no I/O (hard rule 3).' },
          ...forbidden(OTHER_PACKAGES, 'core imports nothing from other packages or apps (brief 4.3).'),
          ...forbidden(TOOLS, 'Nothing imports tools/.'),
          ...forbidden(VENDOR_SDKS, 'Only adapters call vendor SDKs.'),
          ...forbidden(
            ['hono', 'react', 'react-dom', 'drizzle-orm', 'pg', 'postgres'],
            'core has no framework or database dependency.',
          ),
        ],
        nodeBuiltinPaths,
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
          'XMLHttpRequest',
          'localStorage',
          'sessionStorage',
          'require',
          'Buffer',
          'performance',
          'crypto',
          'console',
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
        { object: 'globalThis', property: 'crypto', message: 'No randomness or WebCrypto in core.' },
        { object: 'Intl', property: 'DateTimeFormat', message: 'Locale-dependent output is not reproducible.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'new Date() reads the clock. Take time from the Clock port.',
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: 'Date() reads the clock. Take time from the Clock port.',
        },
        {
          selector: 'CallExpression[callee.property.name=/^toLocale/]',
          message: 'Locale-dependent formatting is not reproducible.',
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
      ['fs', 'path', 'http', 'https', 'net', 'os', 'child_process', 'crypto'].map((name) => ({
        name,
        message: 'The web app never imports server-only modules.',
      })),
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
