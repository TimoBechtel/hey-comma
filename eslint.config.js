import styleCore from '@timobechtel/style/eslint/core.js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['.commitlintrc.cjs'],
  },
  ...styleCore,
  {
    files: ['**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
]);
