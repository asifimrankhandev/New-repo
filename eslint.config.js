// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const checkFile = require('eslint-plugin-check-file');

// kebab-case segment, e.g. "case-detail"
const KEBAB = '+([a-z0-9])*(-+([a-z0-9]))';

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'src/db/migrations/*', 'android/*', 'ios/*'],
  },
  {
    plugins: { 'check-file': checkFile },
    rules: {
      // Project rule: kebab-case file and folder names, no camelCase.
      'check-file/filename-naming-convention': [
        'error',
        { 'src/**/!(_layout).{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        // Expo Router groups "(tabs)" and dynamic segments "[id]" wrap a kebab-case name.
        { 'src/**/': `@(${KEBAB}|\\(${KEBAB}\\)|\\[${KEBAB}\\]|\\[+([a-zA-Z0-9])\\])` },
      ],
      'no-console': 'error',
    },
  },
  {
    // Expo Router dynamic route files are named after their param: "[evidenceId].tsx".
    files: ['src/app/**/[[]*[]].tsx'],
    rules: { 'check-file/filename-naming-convention': 'off' },
  },
]);
