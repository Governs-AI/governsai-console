/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals", "prettier", "@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "warn",
    "prefer-const": "error",
  },
  ignorePatterns: ["node_modules/", ".next/", "out/", "dist/", "build/"],
}
