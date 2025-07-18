#!/usr/bin/env node

/*──────────────────────────────────────────────────
  New Features Integration Tests
  
  Tests the new test badge and redirect functionality
  using real GitHub Gist data and endpoints.
──────────────────────────────────────────────────*/

import { handler } from '../../index.mjs'; // Use the root proxy
import { createMockEvent, validPlatforms, invalidPlatforms } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';

console.log('🧪 New Features Integration Tests');
console.log('Testing test badges and redirects with real data');
console.log('=' .repeat(60));

async function runNewFeaturesTests() {
  const results = [];

  // Test Badge Integration Tests
  console.log('\n🎯 Test Badge Functionality');
  
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `✅ Test Badge: ${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      200,
      (data) => {
        const errors = TestUtils.validateTestBadge(data);
        
        // Additional validations for live data
        if (data.label !== 'tests') {
          errors.push('Label should be "tests"');
        }
        
        if (!['success', 'critical', 'lightgrey'].includes(data.color)) {
          errors.push(`Color should be success/critical/lightgrey, got: ${data.color}`);
        }
        
        // Check message format based on color
        if (data.color === 'success' && !/^\d+ passed$/.test(data.message)) {
          errors.push('Success badges should show "X passed"');
        }
        
        if (data.color === 'critical' && !/^\d+ failed, \d+ passed$/.test(data.message)) {
          errors.push('Critical badges should show "X failed, Y passed"');
        }
        
        if (data.color === 'lightgrey' && data.message !== 'unavailable') {
          errors.push('Unavailable badges should show "unavailable"');
        }
        
        return errors;
      }
    );
    results.push(result);
    
    // Small delay between requests to be nice to the Gist API
    await TestUtils.delay(200);
  }

  // Test badge error handling
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `❌ Test Badge Invalid Platform: ${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Redirect Integration Tests
  console.log('\n🔗 Redirect Functionality');
  
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `🔗 Redirect: ${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      302,
      null, // For redirects, we just check the status code
      (result) => {
        const errors = [];
        
        if (!result.headers || !result.headers.Location) {
          errors.push('Redirect should have Location header');
        }
        
        if (result.headers.Location) {
          try {
            new URL(result.headers.Location);
          } catch {
            errors.push('Location header should be valid URL');
          }
          
          if (!result.headers.Location.includes('github.com')) {
            errors.push('Redirect should point to GitHub');
          }
        }
        
        return errors;
      }
    );
    results.push(result);
    
    await TestUtils.delay(200);
  }

  // Redirect error handling
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `❌ Redirect Invalid Platform: ${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Explicit Package Badge Tests (new routes)
  console.log('\n📦 Explicit Package Badge Routes');
  
  const packageRouteTests = [
    {
      name: '📦 Explicit Route: Newtonsoft.Json',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!/^\d+\.\d+\.\d+/.test(data.message)) {
          errors.push('Should show version number');
        }
        return errors;
      }
    },
    {
      name: '📦 Explicit Route: LocalStack with track',
      path: 'badge/packages/localstack.client',
      query: { source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('1.')) {
          errors.push('Should be v1.x for track=1');
        }
        return errors;
      }
    },
    {
      name: '📦 Explicit Route: Custom styling',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget', label: 'JSON', color: 'purple' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.label !== 'JSON') {
          errors.push('Custom label not applied');
        }
        if (data.color !== 'purple') {
          errors.push('Custom color not applied');
        }
        return errors;
      }
    }
  ];

  for (const test of packageRouteTests) {
    const result = await TestUtils.runTest(
      test.name,
      async () => {
        const event = createMockEvent(test.query, test.path);
        return await handler(event);
      },
      test.expectedStatus,
      test.validation
    );
    results.push(result);
    
    await TestUtils.delay(200);
  }

  // Test response timing for caching validation
  console.log('\n⚡ Performance & Caching Tests');
  
  const performanceResult = await TestUtils.runTest(
    '⚡ Response Time Test (should be fast due to caching)',
    async () => {
      const start = Date.now();
      const event = createMockEvent({}, 'badge/tests/linux');
      const result = await handler(event);
      const duration = Date.now() - start;
      
      return {
        ...result,
        body: JSON.stringify({
          ...JSON.parse(result.body),
          responseTime: duration
        })
      };
    },
    200,
    (data) => {
      const errors = TestUtils.validateTestBadge(data);
      
      // Response should be fast (under 5 seconds even with network)
      if (data.responseTime > 5000) {
        errors.push(`Response time too slow: ${data.responseTime}ms`);
      }
      
      return errors;
    }
  );
  results.push(performanceResult);

  return results;
}

// Run the tests
async function main() {
  try {
    const results = await runNewFeaturesTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 New Features Test Complete!');
    console.log(`   Test badges: ${results.filter(r => r.name.includes('Test Badge:')).filter(r => r.success).length} working`);
    console.log(`   Redirects: ${results.filter(r => r.name.includes('Redirect:')).filter(r => r.success).length} working`);
    console.log(`   Explicit routes: ${results.filter(r => r.name.includes('Explicit Route')).filter(r => r.success).length} working`);
    console.log(`   Error handling: ${results.filter(r => r.name.includes('Invalid')).filter(r => r.success).length} working`);
    console.log(`   Performance: ${results.filter(r => r.name.includes('Performance')).filter(r => r.success).length} acceptable`);
    
    if (summary.failed === 0) {
      console.log('\n✅ ALL NEW FEATURES WORKING!');
      console.log('   Test badges, redirects, and explicit routes are functional');
    } else {
      console.log('\n❌ NEW FEATURE FAILURES DETECTED!');
      console.log('   Check the failing tests above');
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 New features test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 