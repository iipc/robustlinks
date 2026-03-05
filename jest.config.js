/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  // An array of regexp patterns that are matched against all source file paths before transformation.
  // If a file path matches any of the patterns, it will be skipped from transformation.
  transformIgnorePatterns: [
    "/node_modules/"
  ],
  // An array of file extensions your modules use.
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // Setup files to be run before all tests in a test environment.
  // If you have any global setup (e.g., polyfills or mocks), you can include them here.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']

};