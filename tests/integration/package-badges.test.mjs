#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Package Badges Integration Tests
  
  Tests the new explicit package badge routes with
  real NuGet and GitHub API validation.
──────────────────────────────────────────────────*/

import { handler } from '../../index.mjs'; // Use the root proxy
import { createMockEvent } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('📦 Package Badges Integration Tests');
console.log('Testing explicit package badge routes with real APIs');
console.log('=' .repeat(60));

async function runPackageBadgeTests() {
  const results = [];

  // Basic explicit route tests
  console.log('\n📦 Basic Explicit Routes');
  
  const basicTests = [
    {
      name: '📦 Explicit Route: Newtonsoft.Json (NuGet)',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!/^\d+\.\d+\.\d+/.test(data.message)) {
          errors.push('Should show version number');
        }
        if (data.namedLogo !== 'nuget') {
          errors.push('Should have NuGet logo');
        }
        if (!data.label.includes('newtonsoft.json')) {
          errors.push('Label should include package name');
        }
        return errors;
      }
    },
    {
      name: '📦 Explicit Route: EntityFrameworkCore with prerelease',
      path: 'badge/packages/Microsoft.EntityFrameworkCore',
      query: { source: 'nuget', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.namedLogo !== 'nuget') {
          errors.push('Should have NuGet logo');
        }
        return errors;
      }
    },
    {
      name: '📦 Explicit Route: LocalStack with track filtering',
      path: 'badge/packages/localstack.client',
      query: { source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('1.') && data.message !== 'not found') {
          errors.push('Should be v1.x for track=1 or not found');
        }
        return errors;
      }
    }
  ];

  for (const test of basicTests) {
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
    
    await TestUtils.delay(300);
  }

  // Advanced feature tests
  console.log('\n🎨 Advanced Features');
  
  const advancedTests = [
    {
      name: '🎨 Custom Label and Color',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget', label: 'JSON Library', color: 'purple' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.label !== 'JSON Library') {
          errors.push('Custom label not applied');
        }
        if (data.color !== 'purple') {
          errors.push('Custom color not applied');
        }
        return errors;
      }
    },
    {
      name: '🎨 Hex Color Support',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'nuget', color: '#ff6b35' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.color !== '#ff6b35') {
          errors.push('Hex color not applied');
        }
        return errors;
      }
    },
    {
      name: '📊 Semver Range Filtering',
      path: 'badge/packages/Microsoft.AspNetCore.App',
      query: { source: 'nuget', gte: '2.0.0', lt: '3.0.0' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('2.') && data.message !== 'not found') {
          errors.push('Should be 2.x version for range filter or not found');
        }
        return errors;
      }
    }
  ];

  for (const test of advancedTests) {
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
    
    await TestUtils.delay(300);
  }

  // GitHub package tests (if token available)
  if (process.env.GITHUB_TOKEN) {
    console.log('\n🐙 GitHub Package Routes');
    
    const githubTests = [
      {
        name: '🐙 GitHub Explicit Route: LocalStack Client',
        path: 'badge/packages/localstack.client',
        query: { source: 'github', 'include-prerelease': 'true' },
        expectedStatus: 200,
        validation: (data) => {
          const errors = TestUtils.validatePackageBadge(data);
          if (data.namedLogo !== 'github') {
            errors.push('Should have GitHub logo');
          }
          return errors;
        }
      },
      {
        name: '🧹 GitHub with prefer-clean',
        path: 'badge/packages/localstack.client',
        query: { source: 'github', 'include-prerelease': 'true', 'prefer-clean': 'true' },
        expectedStatus: 200,
        validation: (data) => {
          const errors = TestUtils.validatePackageBadge(data);
          if (data.namedLogo !== 'github') {
            errors.push('Should have GitHub logo');
          }
          // Should not have timestamp in version if prefer-clean works
          if (data.message.includes('-202') && data.message !== 'not found') {
            errors.push('Prefer-clean should avoid timestamped versions');
          }
          return errors;
        }
      }
    ];

    for (const test of githubTests) {
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
      
      await TestUtils.delay(300);
    }
  } else {
    console.log('\n🐙 GitHub Package Routes: ⚠️ Skipped (no GITHUB_TOKEN)');
  }

  // Error handling tests
  console.log('\n❌ Error Handling');
  
  const errorTests = [
    {
      name: '❌ Missing package name',
      path: 'badge/packages/',
      query: { source: 'nuget' },
      expectedStatus: 404
    },
    {
      name: '❌ Empty package name',
      path: 'badge/packages/',
      query: { source: 'nuget' },
      expectedStatus: 404
    },
    {
      name: '❌ Invalid package name characters',
      path: 'badge/packages/invalid@package',
      query: { source: 'nuget' },
      expectedStatus: 400
    },
    {
      name: '❌ Missing source parameter',
      path: 'badge/packages/Newtonsoft.Json',
      query: {},
      expectedStatus: 400
    },
    {
      name: '❌ Invalid source',
      path: 'badge/packages/Newtonsoft.Json',
      query: { source: 'invalid' },
      expectedStatus: 400
    }
  ];

  for (const test of errorTests) {
    const result = await TestUtils.runTest(
      test.name,
      async () => {
        const event = createMockEvent(test.query, test.path);
        return await handler(event);
      },
      test.expectedStatus
    );
    results.push(result);
    
    await TestUtils.delay(200);
  }

  // Performance test
  console.log('\n⚡ Performance Test');
  
  const performanceResult = await TestUtils.runTest(
    '⚡ Package Badge Response Time',
    async () => {
      const start = Date.now();
      const event = createMockEvent({ source: 'nuget' }, 'badge/packages/Newtonsoft.Json');
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
      const errors = TestUtils.validatePackageBadge(data);
      
      // Should be reasonably fast (under 5 seconds)
      if (data.responseTime > 5000) {
        errors.push(`Response too slow: ${data.responseTime}ms`);
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
    const results = await runPackageBadgeTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 Package Badge Tests Complete!');
    console.log(`   Basic routes: ${results.filter(r => r.name.includes('📦 Explicit Route')).filter(r => r.success).length} working`);
    console.log(`   Advanced features: ${results.filter(r => r.name.includes('🎨')).filter(r => r.success).length} working`);
    console.log(`   Error handling: ${results.filter(r => r.name.includes('❌')).filter(r => r.success).length} working`);
    
    if (process.env.GITHUB_TOKEN) {
      console.log(`   GitHub integration: ${results.filter(r => r.name.includes('🐙')).filter(r => r.success).length} working`);
    } else {
      console.log(`   GitHub integration: ⚠️ Skipped (no GITHUB_TOKEN)`);
    }
    
    if (summary.failed === 0) {
      console.log('\n✅ ALL PACKAGE BADGE TESTS PASSED!');
      console.log('   Explicit package routes are working correctly');
    } else {
      console.log('\n❌ PACKAGE BADGE TEST FAILURES DETECTED!');
      console.log('   Check the failing tests above');
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Package badge test failed:', error);
    process.exit(1);
  }
}

// Auto-run the tests when file is executed directly
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/'))) {
  main();
} 