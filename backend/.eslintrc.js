// @ts-check
const { defineConfig } = require('eslint-define-config');

module.exports = defineConfig({
    root: true,
    parser: '@typescript-eslint/parser',
    extends: ['eslint:recommended', 'prettier'],
    plugins: ['@typescript-eslint', 'prettier'],
    rules: {
        'prettier/prettier': 'error',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
    },
    env: {
        node: true,
        es2021: true,
    },
});
