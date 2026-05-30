import { defineConfig } from "eslint/config";
import tsEslint from "typescript-eslint";
import { importX } from "eslint-plugin-import-x";
import stylisticPlugin from "@stylistic/eslint-plugin";
import tsParser from '@typescript-eslint/parser'

export default defineConfig(
  tsEslint.configs.strict,
  stylisticPlugin.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    name: "@istok-dev/eslint-base",
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    settings: {
      "import-x/resolver": {
        typescript: true,
        node: true,
      },
    },
    plugins: {
      stylistic: stylisticPlugin,
    },
    rules: {
      "import-x/no-unresolved": ["error"],
      "import-x/order": [
        "error",
        {
          groups: [
            ["builtin", "external"],
            "internal",
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "@internal/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "src/**",
              group: "parent",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          warnOnUnassignedImports: true,
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import-x/newline-after-import": ["error"],
      "no-console": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/max-len": ["error", 120],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/member-delimiter-style": [
        "error",
        {
          multiline: {
            delimiter: "semi",
            requireLast: true,
          },
          singleline: {
            delimiter: "semi",
            requireLast: false,
          },
          multilineDetection: "brackets",
        },
      ],
      "@stylistic/brace-style": ["error", "stroustrup"],
    },
  },
);
