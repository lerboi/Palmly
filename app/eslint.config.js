// Flat ESLint config (ESLint 9). eslint-config-expo carries the RN/Expo rules;
// eslint-config-prettier is last so Prettier owns all formatting decisions.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'expo-env.d.ts'],
  },
]);
