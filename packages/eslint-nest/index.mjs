import { defineConfig } from "eslint/config";

import baseConfig from "@istok-dev/eslint-base";

export default defineConfig(baseConfig, {
  name: "@istok-dev/eslint-nest",
  rules: {
    "@typescript-eslint/no-extraneous-class": "off",
  },
});
