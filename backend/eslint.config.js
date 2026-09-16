const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

// 레이어 의존성 방향 규칙 (docs/4-project-structure.md 2.2절):
// domain은 infrastructure/presentation을 import해서는 안 된다.
const domainBoundaryRule = {
  files: ['src/domain/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/infrastructure/**', '**/presentation/**'],
            message:
              'domain 계층은 infrastructure/presentation을 import할 수 없다 (docs/4-project-structure.md 2.2절).',
          },
        ],
      },
    ],
  },
};

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['eslint.config.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  domainBoundaryRule,
  eslintConfigPrettier,
);
