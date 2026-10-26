module.exports = {
  preset: "jest-expo",
  modulePaths: ["<rootDir>/node_modules"],
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  setupFiles: ["<rootDir>/tests/setup.js"],
};
