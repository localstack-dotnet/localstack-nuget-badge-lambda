/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['tests/vitest/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.git', 'tests/unit', 'tests/integration'],
    
    // Test environment
    environment: 'node',
    
    // Test timeout (useful for integration tests with real APIs)
    testTimeout: 10000,
    
    // Parallel execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false
      }
    },
    
    // Reporter settings
    reporter: ['verbose']
  }
});
