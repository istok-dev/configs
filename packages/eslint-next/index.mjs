import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

import reactConfig from "@istok-dev/eslint-react";

export default defineConfig(
  reactConfig,
  nextPlugin.configs.recommended,
  {
    plugins: {
      next: nextPlugin,
    },
  },
  {
    name: "@istok-dev/eslint-next",
  },
  globalIgnores([".next/**", "next-env.d.ts"]),
);
