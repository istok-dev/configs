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
      "better-tailwindcss/no-unknown-classes": [
        "error",
        {
          ignore: ["istok-*"],
          detectComponentClasses: true,
        },
      ],
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
