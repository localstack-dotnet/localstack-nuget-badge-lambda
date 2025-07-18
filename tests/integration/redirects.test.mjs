#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Redirects Integration Tests
  
  Tests the GitHub redirect functionality using real
  Gist data and endpoints.
──────────────────────────────────────────────────*/

import { handler } from '../../index.mjs'; // Use the root proxy
import { createMockEvent, validPlatforms, invalidPlatforms } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';

console.log('🔗 Redirects Integration Tests');
console.log('Testing GitHub redirect functionality with real data');
console.log('=' .repeat(60));

async function runRedirectTests() {
  const results = [];

  // Valid redirect tests for each platform
  console.log('\n🔗 Valid Redirect Tests');
  
  for (const platform of validPlatforms) {
    const result = await TestUtils.runTest(
      `🔗 Redirect to GitHub: ${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      302,
      null, // No JSON validation for redirects
      (result) => {
        const errors = [];
        
        // Check for Location header
        if (!result.headers || !result.headers.Location) {
          errors.push('Redirect should have Location header');
        }
        
        if (result.headers && result.headers.Location) {
          try {
            const url = new URL(result.headers.Location);
            
            // Should be a GitHub URL
            if (!url.hostname.includes('github.com')) {
              errors.push('Redirect should point to GitHub');
            }
            
            // Should be HTTPS
            if (url.protocol !== 'https:') {
              errors.push('Redirect should use HTTPS');
            }
            
            // Should contain reasonable path structure
            if (!url.pathname.includes('localstack') && !url.pathname.includes('actions')) {
              errors.push('Redirect URL should point to LocalStack or GitHub Actions');
            }
            
          } catch (urlError) {
            errors.push('Location header should be valid URL');
          }
        }
        
        return errors;
      }
    );
    results.push(result);
    
    // Small delay to be nice to the Gist API
    await TestUtils.delay(300);
  }

  // Invalid platform tests
  console.log('\n❌ Invalid Platform Tests');
  
  for (const platform of invalidPlatforms) {
    const result = await TestUtils.runTest(
      `❌ Invalid Platform Redirect: ${platform}`,
      async () => {
        const event = createMockEvent({}, `redirect/test-results/${platform}`);
        return await handler(event);
      },
      404
    );
    results.push(result);
  }

  // Edge case tests
  console.log('\n🔧 Edge Case Tests');
  
  const edgeCases = [
    {
      name: '❌ Empty platform',
      path: 'redirect/test-results/',
      expectedStatus: 404
    },
    {
      name: '❌ Wrong path structure',
      path: 'redirect/invalid/linux',
      expectedStatus: 404
    },
    {
      name: '❌ Case sensitivity test',
      path: 'redirect/test-results/LINUX',
      expectedStatus: 200, // Should work due to case-insensitive routing
      validation: (result) => {
        const errors = [];
        if (!result.headers || !result.headers.Location) {
          errors.push('Should redirect even with uppercase platform');
        }
        return errors;
      }
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
      null,
      testCase.validation
    );
    results.push(result);
    
    await TestUtils.delay(200);
  }

  // Performance test
  console.log('\n⚡ Performance Tests');
  
  const performanceResult = await TestUtils.runTest(
    '⚡ Redirect Response Time (should be fast due to caching)',
    async () => {
      const start = Date.now();
      const event = createMockEvent({}, 'redirect/test-results/linux');
      const result = await handler(event);
      const duration = Date.now() - start;
      
      return {
        ...result,
        responseTime: duration
      };
    },
    302,
    null,
    (result) => {
      const errors = [];
      
      // Should be fast (under 3 seconds even with network)
      if (result.responseTime > 3000) {
        errors.push(`Redirect too slow: ${result.responseTime}ms`);
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
    const results = await runRedirectTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 Redirect Tests Complete!');
    console.log(`   Valid redirects: ${results.filter(r => r.name.includes('Redirect to GitHub')).filter(r => r.success).length} working`);
    console.log(`   Invalid handling: ${results.filter(r => r.name.includes('Invalid')).filter(r => r.success).length} working`);
    console.log(`   Edge cases: ${results.filter(r => r.name.includes('Edge')).filter(r => r.success).length} working`);
    console.log(`   Performance: ${results.filter(r => r.name.includes('Performance')).filter(r => r.success).length} acceptable`);
    
    if (summary.failed === 0) {
      console.log('\n✅ ALL REDIRECT TESTS PASSED!');
      console.log('   GitHub redirects are working correctly');
    } else {
      console.log('\n❌ REDIRECT TEST FAILURES DETECTED!');
      console.log('   Check the failing tests above');
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Redirect test failed:', error);
    process.exit(1);
  }
}

// Auto-run the tests when file is executed directly
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
} 