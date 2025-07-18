/** @type {import('jest').Config} */
export default {
  // Simplified ESM Configuration
  preset: null,
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/jest/**/*.test.mjs'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.mjs'
  ],
  coverageDirectory: 'coverage',
  
  // Test setup
  verbose: true,
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true
};
