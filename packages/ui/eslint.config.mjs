// Minimal flat config for ui (ESLint 8 compatible).
// The shared @governs-ai/eslint-config requires ESLint 9 plugin APIs,
// so we use a standalone config here to avoid the version mismatch.
export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {},
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
