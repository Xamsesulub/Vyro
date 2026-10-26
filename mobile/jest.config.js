module.exports = {
  preset: "jest-expo",
  modulePathIgnorePatterns: ["<rootDir>/.expo/", "<rootDir>/dist/"],
  modulePaths: ["<rootDir>/node_modules"],
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  setupFiles: ["<rootDir>/tests/setup.js"],
};
