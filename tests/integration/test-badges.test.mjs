#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Test Badges Integration Tests
  
  Tests the dynamic test result badge functionality
  using real GitHub Gist data and endpoints.
──────────────────────────────────────────────────*/

import { handler } from '../../index.mjs'; // Use the root proxy
import { createMockEvent, validPlatforms, invalidPlatforms } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';

console.log('🧪 Test Badges Integration Tests');
console.log('Testing dynamic test result badges with real Gist data');
console.log('=' .repeat(60));

async function runTestBadgeTests() {
  const results = [];

  // Valid test badge tests for each platform
  console.log('\n🧪 Test Badge Functionality');
  
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `🧪 Test Badge: ${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      200,
      (data) => {
        const errors = TestUtils.validateTestBadge(data);
        
        // Additional validations for live test badge data
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
        
        // Should have cache seconds for performance
        if (typeof data.cacheSeconds !== 'number' || data.cacheSeconds < 0) {
          errors.push('Should have valid cacheSeconds for performance');
        }
        
        return errors;
      }
    );
    results.push(result);
    
    // Small delay between requests to be nice to the Gist API
    await TestUtils.delay(400);
  }

  // Test badge error handling
  console.log('\n❌ Error Handling');
  
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `❌ Invalid Platform: ${platform}`,
      async () => {
        const event = createMockEvent({}, `badge/tests/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Edge case tests
  console.log('\n🔧 Edge Cases');
  
  const edgeCases = [
    {
      name: '❌ Empty platform',
      path: 'badge/tests/',
      expectedStatus: 404
    },
    {
      name: '❌ Wrong path structure',
      path: 'badge/invalid/linux',
      expectedStatus: 404
    },
    {
      name: '🔀 Case insensitive platform',
      path: 'badge/tests/LINUX',
      expectedStatus: 200,
      validation: (data) => TestUtils.validateTestBadge(data)
    },
    {
      name: '🔀 Mixed case platform',
      path: 'badge/tests/Windows',
      expectedStatus: 200,
      validation: (data) => TestUtils.validateTestBadge(data)
    }
  ];

  for (const testCase of edgeCases) {
    const result = await TestUtils.runTest(
      testCase.name,
      async () => {
        const event = createMockEvent({}, testCase.path);
        return await handler(event);
      },
      testCase.expectedStatus,
      testCase.validation
    );
    results.push(result);
    
    await TestUtils.delay(300);
  }

  // Performance and caching tests
  console.log('\n⚡ Performance & Caching');
  
  const cachingTests = [
    {
      name: '⚡ First Request (may be slower)',
      test: async () => {
        const start = Date.now();
        const event = createMockEvent({}, 'badge/tests/linux');
        const result = await handler(event);
        const duration = Date.now() - start;
        
        return {
          ...result,
          body: JSON.stringify({
            ...JSON.parse(result.body),
            responseTime: duration,
            cacheStatus: 'first-request'
          })
        };
      },
      validation: (data) => {
        const errors = TestUtils.validateTestBadge(data);
        
        // First request might be slower
        if (data.responseTime > 10000) {
          errors.push(`First request too slow: ${data.responseTime}ms`);
        }
        
        return errors;
      }
    },
    {
      name: '⚡ Second Request (should be cached)',
      test: async () => {
        const start = Date.now();
        const event = createMockEvent({}, 'badge/tests/linux');
        const result = await handler(event);
        const duration = Date.now() - start;
        
        return {
          ...result,
          body: JSON.stringify({
            ...JSON.parse(result.body),
            responseTime: duration,
            cacheStatus: 'should-be-cached'
          })
        };
      },
      validation: (data) => {
        const errors = TestUtils.validateTestBadge(data);
        
        // Cached request should be fast
        if (data.responseTime > 3000) {
          errors.push(`Cached request too slow: ${data.responseTime}ms`);
        }
        
        return errors;
      }
    }
  ];

  for (const test of cachingTests) {
    const result = await TestUtils.runTest(
      test.name,
      test.test,
      200,
      test.validation
    );
    results.push(result);
    
    // Small delay between caching tests
    await TestUtils.delay(500);
  }

  // Data quality tests
  console.log('\n🔍 Data Quality');
  
  const dataQualityResult = await TestUtils.runTest(
    '🔍 Test Data Quality Check',
    async () => {
      const event = createMockEvent({}, 'badge/tests/linux');
      const result = await handler(event);
      const data = JSON.parse(result.body);
      
      // Add metadata for quality checking
      const metadata = {
        timestamp: new Date().toISOString(),
        platform: 'linux',
        hasValidFormat: /^\d+ passed$|^\d+ failed, \d+ passed$|^unavailable$/.test(data.message)
      };
      
      return {
        ...result,
        body: JSON.stringify({
          ...data,
          _metadata: metadata
        })
      };
    },
    200,
    (data) => {
      const errors = TestUtils.validateTestBadge(data);
      
      if (!data._metadata.hasValidFormat) {
        errors.push('Test badge message format is invalid');
      }
      
      return errors;
    }
  );
  results.push(dataQualityResult);

  return results;
}

// Run the tests
async function main() {
  try {
    const results = await runTestBadgeTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 Test Badge Tests Complete!');
    console.log(`   Valid platforms: ${results.filter(r => r.name.includes('🧪 Test Badge:')).filter(r => r.success).length} working`);
    console.log(`   Error handling: ${results.filter(r => r.name.includes('Invalid Platform')).filter(r => r.success).length} working`);
    console.log(`   Edge cases: ${results.filter(r => r.name.includes('🔧') || r.name.includes('🔀')).filter(r => r.success).length} working`);
    console.log(`   Performance: ${results.filter(r => r.name.includes('⚡')).filter(r => r.success).length} acceptable`);
    console.log(`   Data quality: ${results.filter(r => r.name.includes('🔍')).filter(r => r.success).length} validated`);
    
    if (summary.failed === 0) {
      console.log('\n✅ ALL TEST BADGE TESTS PASSED!');
      console.log('   Dynamic test result badges are working correctly');
      console.log('   Real CI/CD data integration is functional');
    } else {
      console.log('\n❌ TEST BADGE FAILURES DETECTED!');
      console.log('   Check the failing tests above');
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test badge test failed:', error);
    process.exit(1);
  }
}

// Auto-run the tests when file is executed directly
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
} 