// .eslintrc.js
module.exports = {
  env: {
    es6: true,
    node: true,
    commonjs: true  // Add this to recognize require and module.exports
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'script'  // Changed from 'module' to 'script' for CommonJS
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "single"],
    "max-len": ["error", { "code": 100 }]
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
};