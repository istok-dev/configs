import { defineConfig } from "eslint/config";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";

import baseConfig from "@istok-dev/eslint-base";

export default defineConfig(
  baseConfig,
  eslintReact.configs["recommended-typescript"],
  reactHooksPlugin.configs.flat.recommended,
  betterTailwindcssPlugin.configs.recommended,
  {
    name: "@istok-dev/eslint-react",
    rules: {
      "react/react-in-jsx-scope": "off",
      "@eslint-react/no-context-provider": "error",
      "@eslint-react/no-forward-ref": "error",
      "@eslint-react/no-use-context": "error",
      "@eslint-react/no-context-provider": "error",
      "better-tailwindcss/no-unknown-classes": [
        "error",
        {
          ignore: ["istok-*"],
          detectComponentClasses: true,
        },
      ],
      'better-tailwindcss/enforce-consistent-class-order': 'error',
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
);
