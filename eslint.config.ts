import js from "@eslint/js";
import {defineConfig} from "eslint/config";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import jest from "eslint-plugin-jest";
import {noUnusedClassMembers} from "./eslint/rules/no-unused-class-members.ts";
import {commentHygiene, mdParser} from "./eslint/rules/comment-hygiene.ts";
import {noBooleanLiteralCompare} from "./eslint/rules/no-boolean-literal-compare.ts";
import {noRestatingComments} from "./eslint/rules/no-restating-comments.ts";

export default defineConfig([
  {
    files: ["**/*.{ts}"],
    plugins: {js},
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({...config, files: ["**/*.ts", "*.ts"]})),
  {
    files: ["**/*.ts", "*.ts"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.ts", "*.ts"],
    plugins: {
      "@stylistic": stylistic,
      import: importPlugin,
      local: {rules: {
        "no-unused-class-members": noUnusedClassMembers,
        "comment-hygiene": commentHygiene,
        "no-boolean-literal-compare": noBooleanLiteralCompare,
        "no-restating-comments": noRestatingComments,
      }},
    },
    rules: {
      "local/no-unused-class-members": "error",
      "local/comment-hygiene": "error",
      "local/no-boolean-literal-compare": "error",
      "local/no-restating-comments": "error",
      "eqeqeq": ["error", "always"],
      "object-curly-spacing": ["error", "never"],
      "semi": ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      "quotes": ["error", "double", {
        allowTemplateLiterals: true,
        avoidEscape: false,
      }],
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.property.name='forEach']",
        message: "forEach is prohibited. Use for..of or functional methods with value return.",
      }, {
        selector: "AssignmentExpression:not(ExpressionStatement > AssignmentExpression):not(ForStatement > AssignmentExpression)",
        message: "Assignment inside an expression is prohibited.",
      }, {
        selector: "TSInterfaceDeclaration",
        message: "interface is prohibited; use a type alias.",
      }],
      "no-restricted-properties": ["error", {
        object: "Bun",
        property: "write",
        message: "Bun.write is prohibited; use writeFileSync from node:fs.",
      }, {
        object: "Bun",
        property: "file",
        message: "Bun.file is prohibited; use readFile/readFileSync from node:fs.",
      }],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/member-delimiter-style": ["error", {
        "multiline": {delimiter: "comma", requireLast: true},
        "singleline": {delimiter: "comma", requireLast: false},
      }],
      "import/extensions": ["error", "ignorePackages"],
      "@typescript-eslint/no-floating-promises": ["off"],
      "@typescript-eslint/no-misused-promises": ["off"],
      "@typescript-eslint/no-unused-vars": ["off"/*"error", {argsIgnorePattern: "^_"}*/], // TODO: get back
      "@typescript-eslint/strict-boolean-expressions": ["error", {
        allowNumber: false,
        allowString: false,
        allowAny: false,
        allowNullableBoolean: false,
        allowNullableEnum: false,
        allowNullableNumber: false,
        allowNullableObject: false,
        allowNullableString: false,
      }],
      "@typescript-eslint/no-unnecessary-condition": ["error", {"allowConstantLoopConditions": true}],
      // "@typescript-eslint/no-non-null-assertion": "error", // TODO: get back maybe
      "@typescript-eslint/restrict-plus-operands": ["error", {
        allowAny: false,
        allowBoolean: false,
        allowNullish: false,
        allowNumberAndString: false,
        allowRegExp: false,
        skipCompoundAssignments: false,
      }],
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    plugins: {jest},
    settings: {jest: {globalPackage: "bun:test"}},
    rules: {
      // bun-types types the async matchers (.rejects/.resolves) as void although
      // they return a promise at runtime (test.d.ts: rejects: Matchers<unknown>),
      // so: type-based no-floating-promises cannot see unawaited assertions and
      // type-based await-thenable false-positives on the correct `await`. The
      // syntactic valid-expect + alwaysAwait enforces the awaits instead.
      "jest/valid-expect": ["error", {alwaysAwait: true}],
      "@typescript-eslint/await-thenable": "off",
    },
  },
  {
    files: ["**/*.md"],
    ignores: ["plans/**"],
    plugins: {local: {rules: {"comment-hygiene": commentHygiene}}},
    languageOptions: {parser: mdParser},
    rules: {"local/comment-hygiene": ["error", {prose: true}]},
  },
]);
