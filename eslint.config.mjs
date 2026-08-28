import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import next from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "dist/**",
    "out/**",
    "build/**",
    "work/**",
    "playwright-report/**",
    "test-results/**",
    ".playwright/**",
    "next-env.d.ts",
  ]),
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  next.configs["core-web-vitals"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["next", "next/**", "react", "react/**", "@/app/**", "@/components/**", "@/features/**", "@/server/**", "@/services/**"],
          message: "core must remain framework-neutral and dependency-free.",
        }],
      }],
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/**", "@/features/**", "@/server/**", "@/services/**"],
          message: "UI primitives cannot depend on application or business layers.",
        }],
      }],
    },
  },
  {
    files: ["features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/**"],
          message: "Features must not depend on the routing layer.",
        }],
      }],
    },
  },
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/**", "@/components/**", "@/features/**", "@/server/**"],
          message: "Transport adapters must remain independent from UI and routing layers.",
        }],
      }],
    },
  },
]);

export default eslintConfig;
