#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Router Unit Tests
  
  Tests the routing logic, 404 handling, and 
  parameter extraction without external dependencies.
──────────────────────────────────────────────────*/

import { handler } from '../../src/index.mjs';
import { createMockEvent, validPlatforms, invalidPlatforms } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';

console.log('🧪 Router Unit Tests');
console.log('Testing route matching, parameter extraction, and 404 handling');
console.log('=' .repeat(60));

async function runRouterTests() {
  const results = [];

  // Test valid test badge routes
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `Valid test badge route: /badge/tests/${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      200,
      (data) => TestUtils.validateTestBadge(data)
    );
    results.push(result);
  }

  // Test invalid test badge routes  
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `Invalid test badge route: /badge/tests/${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Test valid redirect routes
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `Valid redirect route: /redirect/test-results/${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      302
    );
    results.push(result);
  }

  // Test invalid redirect routes
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `Invalid redirect route: /redirect/test-results/${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Test package badge routes
  const packageTests = [
    {
      name: 'Valid package route with path param',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget' },
      expectedStatus: 200
    },
    {
      name: 'Package route missing package name',
      path: 'badge/packages/',
      query: {},
      expectedStatus: 404
    },
    {
      name: 'Package route empty package name',
      path: 'badge/packages/""',
      query: {},
      expectedStatus: 400  // Empty package name is a client error, not not-found
    }
  ];

  for (const test of packageTests) {
    const result = await TestUtils.runTest(
      test.name,
      async () => {
        const event = createMockEvent(test.query, test.path);
        return await handler(event);
      },
      test.expectedStatus,
      test.expectedStatus === 200 ? (data) => TestUtils.validatePackageBadge(data) : null
    );
    results.push(result);
  }

  // Test root path (backward compatibility)
  const result = await TestUtils.runTest(
    'Root path with query params (backward compatibility)',
    async () => {
      const event = createMockEvent({ package: 'Newtonsoft.Json', source: 'nuget' });
      return await handler(event);
    },
    200,
    (data) => TestUtils.validatePackageBadge(data)
  );
  results.push(result);

  // Test empty root path
  const emptyResult = await TestUtils.runTest(
    'Empty root path',
    async () => {
      const event = createMockEvent({}, '');
      return await handler(event);
    },
    400 // Should fail because no package name
  );
  results.push(emptyResult);

  // Test completely invalid routes
  const invalidRoutes = [
    'some/random/route',
    'invalid/path/here',
    'badge/unknown/linux',
    'redirect/invalid/linux',
    'completely-wrong'
  ];

  for (const route of invalidRoutes) {
    const result = await TestUtils.runTest(
      `Invalid route: /${route}`,
      async () => {
        const event = createMockEvent({}, route);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Test case sensitivity
  const caseResult = await TestUtils.runTest(
    'Case insensitive routing: /BADGE/TESTS/LINUX',
    async () => {
      const event = createMockEvent({}, 'BADGE/TESTS/LINUX');
      return await handler(event);
    },
    200,
    (data) => TestUtils.validateTestBadge(data)
  );
  results.push(caseResult);

  return results;
}

// Run the tests
async function main() {
  try {
    const results = await runRouterTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 Router Test Complete!');
    console.log(`   Route matching: ${results.filter(r => r.name.includes('Valid')).filter(r => r.success).length} working`);
    console.log(`   404 handling: ${results.filter(r => r.name.includes('Invalid')).filter(r => r.success).length} working`);
    console.log(`   Backward compatibility: ${results.filter(r => r.name.includes('backward')).filter(r => r.success).length} working`);
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Router test failed:', error);
    process.exit(1);
  }
}

// Auto-run the tests when file is executed directly
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
} 