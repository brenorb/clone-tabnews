import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import next from "@next/eslint-plugin-next";
import { fixupPluginRules } from "@eslint/compat";

export default [
  { ignores: [".next/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: { ecmaVersion: 2022 },
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  {
    files: ["*.js", "infra/**/*.js", "scripts/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["pages/**/*.{js,jsx}"],
    ignores: ["pages/api/**"],
    languageOptions: {
      globals: { ...globals.browser, process: "readonly" },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "@next/next": fixupPluginRules(next) },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...next.configs.recommended.rules,
      ...next.configs["core-web-vitals"].rules,
    },
  },
  {
    files: ["pages/api/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["tests/**/*.test.js"],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
];
