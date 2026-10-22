// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const pluginQuery = require("@tanstack/eslint-plugin-query");

module.exports = defineConfig([
  expoConfig,
  ...pluginQuery.configs["flat/recommended"],
  {
    ignores: ["dist/*"],
  },
  // components/ui holds the native gluestack components. Screens and other code use the
  // wrappers in src/components instead, so swapping the UI library only touches the wrappers.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ui", "@/components/ui/*", "**/components/ui/*"],
              message:
                "Import the wrapper from src/components instead of the native component in components/ui. If there is no wrapper yet, add one, or opt out with an eslint-disable comment and a reason.",
            },
          ],
        },
      ],
    },
  },
  // The wrappers (src/components/*.tsx) and the native components themselves may import ui.
  {
    files: ["src/components/*.{ts,tsx}", "src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
