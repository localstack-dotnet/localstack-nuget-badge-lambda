#!/usr/bin/env node

/*──────────────────────────────────────────────────
  Backward Compatibility Integration Tests
  
  Ensures 100% backward compatibility with existing 
  package badge functionality. These tests use real APIs.
──────────────────────────────────────────────────*/

import { handler } from '../../index.mjs'; // Use the root proxy
import { createMockEvent, testParameters } from '../fixtures/sampleData.mjs';
import { TestUtils } from '../helpers/testUtils.mjs';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Backward Compatibility Integration Tests');
console.log('Testing existing package badge functionality with real APIs');
console.log('=' .repeat(60));

async function runBackwardCompatibilityTests() {
  const results = [];

  // Core functionality tests (most critical)
  const coreTests = [
    {
      name: '🔵 Basic NuGet Package',
      params: { package: 'Newtonsoft.Json', source: 'nuget' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!/^\d+\.\d+\.\d+$/.test(data.message)) {
          errors.push('Message should be semver format');
        }
        if (data.color !== 'blue') {
          errors.push('Should be blue for stable release');
        }
        return errors;
      }
    },
    {
      name: '🎯 Track v2 Only (ASP.NET Core)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', track: '2' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('2.')) {
          errors.push('Should start with 2.x for track=2');
        }
        return errors;
      }
    },
    {
      name: '🎯 Track v1 (LocalStack)',
      params: { package: 'localstack.client', source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    },
    {
      name: '🎯 Track v1 Format Flexibility (accepts "v1")',
      params: { package: 'localstack.client', source: 'nuget', track: 'v1' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    }
  ];

  // Two-track strategy tests
  const twoTrackTests = [
    {
      name: '🛡️ Two-Track: v1.x Maintenance (LocalStack.Client)',
      params: { package: 'localstack.client', source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('1.')) {
          errors.push('Should be 1.x version for maintenance track');
        }
        return errors;
      }
    },
    {
      name: '🚀 Two-Track: v2.x Future (LocalStack.Client)',
      params: { package: 'localstack.client', source: 'nuget', track: '2', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('2.')) {
          errors.push('Should be 2.x version for future track');
        }
        return errors;
      }
    }
  ];

  // Parameter variant tests
  const parameterTests = [
    {
      name: '🔧 Parameter Variant: includePrerelease (camelCase)',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', includePrerelease: 'true' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    },
    {
      name: '🔧 Parameter Variant: includeprerelease (lowercase)',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', includeprerelease: 'true' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    }
  ];

  // Semver range tests
  const semverTests = [
    {
      name: '📊 Semver Range: gte Only',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    },
    {
      name: '📊 Semver Range: Combined (gte + lt)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0', lt: '3.0.0' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (!data.message.startsWith('2.')) {
          errors.push('Should be 2.x version for range 2.0.0 <= v < 3.0.0');
        }
        return errors;
      }
    },
    {
      name: '📊 Semver Range: Partial Version Coercion',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0', lt: '3.0' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    }
  ];

  // Customization tests
  const customizationTests = [
    {
      name: '🎨 Custom Label and Color',
      params: { package: 'Newtonsoft.Json', source: 'nuget', label: 'JSON.NET', color: 'purple' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.label !== 'JSON.NET') {
          errors.push('Custom label not applied');
        }
        if (data.color !== 'purple') {
          errors.push('Custom color not applied');
        }
        return errors;
      }
    },
    {
      name: '🎨 Custom Hex Color',
      params: { package: 'Newtonsoft.Json', source: 'nuget', color: '#ff6b35' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.color !== '#ff6b35') {
          errors.push('Custom hex color not applied');
        }
        return errors;
      }
    }
  ];

  // Error handling tests
  const errorTests = [
    {
      name: '❌ Non-existent Package',
      params: { package: 'definitely-does-not-exist-12345', source: 'nuget' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.message !== 'not found') {
          errors.push('Should return "not found" for non-existent package');
        }
        if (data.color !== 'lightgrey') {
          errors.push('Should be lightgrey for not found');
        }
        return errors;
      }
    },
    {
      name: '❌ Invalid Package Name',
      params: { package: 'invalid/package/name!', source: 'nuget' },
      expectedStatus: 400
    },
    {
      name: '❌ Missing Package Parameter',
      params: { source: 'nuget' },
      expectedStatus: 400
    },
    {
      name: '❌ Invalid Source',
      params: { package: 'test.package', source: 'invalid-source' },
      expectedStatus: 400
    }
  ];

  // GitHub tests (if token available)
  const githubTests = process.env.GITHUB_TOKEN ? [
    {
      name: '🐙 GitHub Package: With Prereleases',
      params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: (data) => {
        const errors = TestUtils.validatePackageBadge(data);
        if (data.namedLogo !== 'github') {
          errors.push('Should have github logo');
        }
        return errors;
      }
    },
    {
      name: '🧹 GitHub Package: Prefer Clean',
      params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true', 'prefer-clean': 'true' },
      expectedStatus: 200,
      validation: (data) => TestUtils.validatePackageBadge(data)
    }
  ] : [];

  // Run all test suites
  const allTests = [
    ...coreTests,
    ...twoTrackTests,
    ...parameterTests,
    ...semverTests,
    ...customizationTests,
    ...errorTests,
    ...githubTests
  ];

  console.log(`🎯 Running ${allTests.length} backward compatibility tests...`);
  console.log(`🔑 GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not Set'}`);

  for (const test of allTests) {
    const result = await TestUtils.runTest(
      test.name,
      async () => {
        const event = createMockEvent(test.params);
        return await handler(event);
      },
      test.expectedStatus,
      test.validation
    );
    results.push(result);

    // Small delay to be nice to APIs
    await TestUtils.delay(100);
  }

  return results;
}

// Run the tests
async function main() {
  try {
    const results = await runBackwardCompatibilityTests();
    const summary = TestUtils.summarizeResults(results);
    
    console.log('\n🎯 Backward Compatibility Test Complete!');
    console.log(`   Core functionality: ${results.filter(r => r.name.includes('🔵') || r.name.includes('🎯')).filter(r => r.success).length} working`);
    console.log(`   Two-track strategy: ${results.filter(r => r.name.includes('Two-Track')).filter(r => r.success).length} working`);
    console.log(`   Parameter variants: ${results.filter(r => r.name.includes('Parameter')).filter(r => r.success).length} working`);
    console.log(`   Semver filtering: ${results.filter(r => r.name.includes('Semver')).filter(r => r.success).length} working`);
    console.log(`   Customization: ${results.filter(r => r.name.includes('🎨')).filter(r => r.success).length} working`);
    console.log(`   Error handling: ${results.filter(r => r.name.includes('❌')).filter(r => r.success).length} working`);
    
    if (process.env.GITHUB_TOKEN) {
      console.log(`   GitHub integration: ${results.filter(r => r.name.includes('🐙')).filter(r => r.success).length} working`);
    } else {
      console.log(`   GitHub integration: ⚠️ Skipped (no GITHUB_TOKEN)`);
    }
    
    if (summary.failed === 0) {
      console.log('\n✅ ALL BACKWARD COMPATIBILITY TESTS PASSED!');
      console.log('   Existing functionality is 100% preserved');
    } else {
      console.log('\n❌ BACKWARD COMPATIBILITY FAILURES DETECTED!');
      console.log('   This is a CRITICAL issue that must be fixed');
    }
    
    // Exit with appropriate code
    process.exit(summary.failed === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Backward compatibility test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 