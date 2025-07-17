#!/usr/bin/env node

import { handler } from './index.mjs';
import { config } from 'dotenv';
import axios from 'axios';
import semver from 'semver';

// Load environment variables from .env file
config();

function createTestEvent(queryParams = {}, pathParam = null) {
  return {
    resource: '/{proxy+}',
    path: pathParam ? `/${pathParam}` : '/',
    httpMethod: 'GET',
    headers: {
      'Host': 'localhost:3000',
      'User-Agent': 'test-client'
    },
    multiValueHeaders: {},
    pathParameters: pathParam ? { proxy: pathParam } : null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: Object.fromEntries(
      Object.entries(queryParams).map(([k, v]) => [k, [v]])
    ),
    stageVariables: null,
    requestContext: {
      resourceId: 'test',
      resourcePath: '/{proxy+}',
      httpMethod: 'GET',
      extendedRequestId: 'test',
      requestTime: new Date().toISOString(),
      path: '/test',
      accountId: 'test',
      protocol: 'HTTP/1.1',
      stage: 'test',
      domainPrefix: 'test',
      requestTimeEpoch: Date.now(),
      requestId: 'test',
      identity: { sourceIp: '127.0.0.1' },
      domainName: 'localhost',
      apiId: 'test'
    },
    body: null,
    isBase64Encoded: false
  };
}

function validateShieldsSchema(data) {
  const errors = [];
  
  // Required fields
  if (typeof data.schemaVersion !== 'number' || data.schemaVersion !== 1) {
    errors.push('schemaVersion must be number 1');
  }
  if (typeof data.label !== 'string' || data.label.length === 0) {
    errors.push('label must be non-empty string');
  }
  if (typeof data.message !== 'string' || data.message.length === 0) {
    errors.push('message must be non-empty string');
  }
  if (typeof data.color !== 'string' || data.color.length === 0) {
    errors.push('color must be non-empty string');
  }
  
  // Optional fields validation
  if (data.namedLogo !== undefined && typeof data.namedLogo !== 'string') {
    errors.push('namedLogo must be string if present');
  }
  
  // Color validation (basic check for known values or hex)
  const validColors = ['blue', 'orange', 'lightgrey', 'green', 'red', 'yellow', 'purple', 'pink'];
  const isHexColor = /^#[0-9A-Fa-f]{6}$/.test(data.color);
  if (!validColors.includes(data.color) && !isHexColor) {
    errors.push(`color '${data.color}' should be valid color name or hex`);
  }
  
  return errors;
}

// Real API validation helpers
async function fetchNuGetVersions(packageName) {
  try {
    const url = `https://api.nuget.org/v3-flatcontainer/${encodeURIComponent(packageName)}/index.json`;
    const { data } = await axios.get(url);
    return data.versions;
  } catch (error) {
    return null;
  }
}

async function fetchGitHubVersions(org, packageName) {
  if (!process.env.GITHUB_TOKEN) {
    return null;
  }
  
  try {
    // GitHub Packages API endpoint for versions
    const url = `https://api.github.com/orgs/${org}/packages/nuget/${packageName}/versions`;
    const { data } = await axios.get(url, {
      headers: { 
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return data.map(version => version.name);
  } catch (error) {
    console.log(`   ⚠️  GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
    return null;
  }
}

async function validateVersionAgainstRealAPI(packageName, source, resultVersion, params = {}) {
  console.log(`   🔍 Validating against real ${source.toUpperCase()} API...`);
  
  let actualVersions = null;
  if (source === 'nuget') {
    actualVersions = await fetchNuGetVersions(packageName);
  } else if (source === 'github') {
    actualVersions = await fetchGitHubVersions('localstack', packageName);
  }
  
  if (!actualVersions) {
    console.log(`   ⚠️  Could not fetch real API data for validation`);
    return true; // Can't validate, assume OK
  }
  
  if (resultVersion === 'not found') {
    // For "not found" results, verify no matching versions exist
    const hasMatchingVersions = actualVersions.some(v => {
      if (params.track && !v.startsWith(params.track.replace('v', '') + '.')) return false;
      if (!params['include-prerelease'] && semver.prerelease(v)) return false;
      return true;
    });
    
    if (hasMatchingVersions) {
      console.log(`   ❌ API returned "not found" but matching versions exist in real API`);
      return false;
    } else {
      console.log(`   ✅ "not found" result validated - no matching versions in real API`);
      return true;
    }
  }
  
  // For actual versions, verify they exist in the real API
  if (!actualVersions.includes(resultVersion)) {
    console.log(`   ❌ Version ${resultVersion} not found in real ${source.toUpperCase()} API`);
    console.log(`   📋 Available versions: ${actualVersions.slice(0, 5).join(', ')}${actualVersions.length > 5 ? '...' : ''}`);
    return false;
  }
  
  console.log(`   ✅ Version ${resultVersion} confirmed in real ${source.toUpperCase()} API`);
  return true;
}

function validateExpectedContent(data, expectedValues = {}) {
  const errors = [];
  
  if (expectedValues.messagePattern && !expectedValues.messagePattern.test(data.message)) {
    errors.push(`message '${data.message}' doesn't match expected pattern`);
  }
  
  if (expectedValues.color && data.color !== expectedValues.color) {
    errors.push(`expected color '${expectedValues.color}', got '${data.color}'`);
  }
  
  if (expectedValues.logo && data.namedLogo !== expectedValues.logo) {
    errors.push(`expected logo '${expectedValues.logo}', got '${data.namedLogo}'`);
  }
  
  if (expectedValues.labelContains && !data.label.includes(expectedValues.labelContains)) {
    errors.push(`label '${data.label}' should contain '${expectedValues.labelContains}'`);
  }
  
  return errors;
}

async function runTest(testName, queryParams = {}, pathParam = null, expectedStatus = 200, validation = {}, validateAPI = false) {
  console.log(`\n🧪 ${testName}`);
  console.log(`📋 Query Params: ${JSON.stringify(queryParams)}`);
  if (pathParam) console.log(`🛤️  Path Param: ${pathParam}`);
  console.log('─'.repeat(70));
  
  try {
    const event = createTestEvent(queryParams, pathParam);
    const result = await handler(event);
    
    const statusIcon = result.statusCode === expectedStatus ? '✅' : '❌';
    console.log(`${statusIcon} Status: ${result.statusCode} (expected: ${expectedStatus})`);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      
      // Validate shields.io schema
      const schemaErrors = validateShieldsSchema(data);
      if (schemaErrors.length === 0) {
        console.log(`✅ Schema: Valid shields.io endpoint badge format`);
      } else {
        console.log(`❌ Schema Errors:`);
        schemaErrors.forEach(error => console.log(`   • ${error}`));
      }
      
      // Validate expected content
      const contentErrors = validateExpectedContent(data, validation);
      if (contentErrors.length === 0 && Object.keys(validation).length > 0) {
        console.log(`✅ Content: Matches expectations`);
      } else if (contentErrors.length > 0) {
        console.log(`❌ Content Errors:`);
        contentErrors.forEach(error => console.log(`   • ${error}`));
      }
      
      // Show response summary
      console.log(`📊 Response:`);
      console.log(`   Label: "${data.label}"`);
      console.log(`   Message: "${data.message}"`);
      console.log(`   Color: ${data.color}`);
      if (data.namedLogo) console.log(`   Logo: ${data.namedLogo}`);
      
      // Real API validation if requested
      let apiValidation = true;
      if (validateAPI && (queryParams.source === 'nuget' || queryParams.source === 'github')) {
        const packageName = queryParams.package || pathParam;
        if (packageName) {
          apiValidation = await validateVersionAgainstRealAPI(
            packageName, 
            queryParams.source, 
            data.message, 
            queryParams
          );
        }
      }
      
      return { 
        success: result.statusCode === expectedStatus && schemaErrors.length === 0 && contentErrors.length === 0 && apiValidation,
        data 
      };
      
    } else {
      const error = JSON.parse(result.body);
      console.log(`❌ Error: ${error.error || 'Unknown error'}`);
      return { success: result.statusCode === expectedStatus, data: error };
    }
    
  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 COMPREHENSIVE BADGE API TESTS');
  console.log('='.repeat(70));
  console.log(`🔑 GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not Set'}`);
  console.log(`🎯 Two-Track Strategy: LocalStack.Client v1.x (maintenance) & v2.x (future)`);
  console.log('='.repeat(70));

  const tests = [
    // === BASIC FUNCTIONALITY TESTS ===
    {
      name: '🔵 Basic NuGet Package',
      params: { package: 'Newtonsoft.Json', source: 'nuget' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^\d+\.\d+\.\d+$/,  // Semver format
        color: 'blue',  // Should be stable
        logo: 'nuget',
        labelContains: 'newtonsoft.json'
      },
      validateAPI: true
    },
    
    {
      name: '🔄 Include Prereleases',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: {
        logo: 'nuget',
        labelContains: 'microsoft'
      },
      validateAPI: true
    },

    // === VERSION TRACKING TESTS ===
    {
      name: '🎯 Track v2 Only (ASP.NET Core)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', track: '2' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+$/,  // Should start with 2.x
        color: 'blue',
        logo: 'nuget'
      },
      validateAPI: true
    },
    
    {
      name: '🎯 Track v1 (LocalStack - should work for v1.x)',
      params: { package: 'localstack.client', source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: {
        logo: 'nuget'
      },
      validateAPI: true
    },

    {
      name: '🎯 Track v1 Format Flexibility (accepts "v1")',
      params: { package: 'localstack.client', source: 'nuget', track: 'v1' },
      expectedStatus: 200,
      validation: {
        logo: 'nuget'
      },
      validateAPI: true
    },

    // === TWO-TRACK STRATEGY DEMONSTRATION ===
    {
      name: '🛡️ Two-Track: v1.x Maintenance (LocalStack.Client)',
      params: { package: 'localstack.client', source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^1\.\d+\.\d+$/,  // Should be 1.x version
        logo: 'nuget'
      },
      validateAPI: true
    },

    {
      name: '🚀 Two-Track: v2.x Future (LocalStack.Client)',
      params: { package: 'localstack.client', source: 'nuget', track: '2', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+/,  // Should be 2.x version (may have prerelease suffix)
        logo: 'nuget'
      },
      validateAPI: true
    },

    // === PARAMETER PARSING TESTS ===
    {
      name: '� Parameter Variant: includePrerelease (camelCase)',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', includePrerelease: 'true' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    {
      name: '🔧 Parameter Variant: includeprerelease (lowercase)',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', includeprerelease: 'true' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    // === SEMVER RANGE FILTERING TESTS ===
    {
      name: '📊 Semver Range: gte Only',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0' },
      expectedStatus: 200,
      validation: { logo: 'nuget' },
      validateAPI: true
    },
    
    {
      name: '📊 Semver Range: Combined (gte + lt)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0', lt: '3.0.0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+$/,  // Should be 2.x version
        logo: 'nuget'
      },
      validateAPI: true
    },

    {
      name: '📊 Semver Range: Partial Version Coercion',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0', lt: '3.0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+$/,  // Should work with partial versions
        logo: 'nuget'
      }
    },

    // === CUSTOM STYLING TESTS ===
    {
      name: '🎨 Custom Label and Color',
      params: { package: 'Newtonsoft.Json', source: 'nuget', label: 'JSON.NET', color: 'purple' },
      expectedStatus: 200,
      validation: {
        color: 'purple',
        labelContains: 'JSON.NET'
      }
    },

    {
      name: '🎨 Custom Hex Color',
      params: { package: 'Newtonsoft.Json', source: 'nuget', color: '#ff6b35' },
      expectedStatus: 200,
      validation: {
        color: '#ff6b35'
      }
    },
    
    // === PATH PARAMETER TESTS ===
    {
      name: '🛤️  Path Parameter Fallback',
      params: { source: 'nuget', track: '2' },
      pathParam: 'Microsoft.AspNetCore.App',
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    // === GITHUB PACKAGES TESTS ===
    ...(process.env.GITHUB_TOKEN ? [
      {
        name: '🐙 GitHub Package: Basic',
        params: { package: 'localstack.client', source: 'github' },
        expectedStatus: 200,
        validation: {
          logo: 'github',
          labelContains: 'localstack.client'
        },
        validateAPI: true
      },

      {
        name: '🐙 GitHub Package: With Prereleases',
        params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true' },
        expectedStatus: 200,
        validation: {
          logo: 'github',
          labelContains: 'localstack.client'
        },
        validateAPI: true
      },

      {
        name: '🧹 GitHub Package: Prefer Clean (avoid timestamped builds)',
        params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true', 'prefer-clean': 'true' },
        expectedStatus: 200,
        validation: {
          logo: 'github',
          labelContains: 'localstack.client'
        },
        validateAPI: true
      },

      {
        name: '🔧 GitHub Package: preferClean Parameter Variant',
        params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true', preferClean: 'true' },
        expectedStatus: 200,
        validation: { logo: 'github' }
      }
    ] : []),
    
    // === ERROR HANDLING TESTS ===
    {
      name: '❌ Non-existent Package',
      params: { package: 'definitely-does-not-exist-12345', source: 'nuget' },
      expectedStatus: 200,  // Should return "not found" badge, not error
      validation: {
        messagePattern: /^not found$/,
        color: 'lightgrey'
      }
    },
    
    {
      name: '❌ Invalid Package Name (special characters)',
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
      expectedStatus: 400  // Changed from 500 to 400 - this is client error, not server error
    },

    // === EDGE CASES ===
    {
      name: '⚠️  Impossible Range Filter (should return not found)',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gt: '99.0.0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,
        color: 'lightgrey'
      }
    },

    {
      name: '⚠️  Track Non-existent Major Version',
      params: { package: 'Newtonsoft.Json', source: 'nuget', track: '99' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,
        color: 'lightgrey'
      }
    },

    // === MALFORMED PARAMETER TESTS ===
    {
      name: '🔧 Malformed Boolean: include-prerelease',
      params: { package: 'Newtonsoft.Json', source: 'nuget', 'include-prerelease': 'invalid' },
      expectedStatus: 200,  // Should treat as false
      validation: { logo: 'nuget' }
    },

    {
      name: '🔧 Malformed Semver Range',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gte: 'not-a-version' },
      expectedStatus: 400  // Should return error for invalid semver
    },

    // === COMPREHENSIVE VALIDATION TESTS ===
    {
      name: '❌ Empty Package Name',
      params: { package: '', source: 'nuget' },
      expectedStatus: 400
    },

    {
      name: '❌ Package Name with Spaces',
      params: { package: 'invalid package name', source: 'nuget' },
      expectedStatus: 400
    },

    {
      name: '❌ Package Name with Invalid Characters (@)',
      params: { package: 'package@name', source: 'nuget' },
      expectedStatus: 400
    },

    {
      name: '❌ Package Name with Invalid Characters (%)',
      params: { package: 'package%name', source: 'nuget' },
      expectedStatus: 400
    },

    {
      name: '✅ Package Name with Valid Characters (dots, hyphens, underscores)',
      params: { package: 'valid.package-name_123', source: 'nuget' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,  // Will be not found, but package name is valid
        color: 'lightgrey'
      }
    },

    {
      name: '❌ Invalid Track Parameter (negative number)',
      params: { package: 'Newtonsoft.Json', source: 'nuget', track: '-1' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Track Parameter (non-numeric)',
      params: { package: 'Newtonsoft.Json', source: 'nuget', track: 'invalid' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Track Parameter (decimal)',
      params: { package: 'Newtonsoft.Json', source: 'nuget', track: '1.5' },
      expectedStatus: 400
    },

    {
      name: '✅ Valid Track Parameter (zero)',
      params: { package: 'Newtonsoft.Json', source: 'nuget', track: '0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,  // No v0.x versions exist
        color: 'lightgrey'
      }
    },

    {
      name: '❌ Invalid Semver: gt parameter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gt: 'invalid-version' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Semver: gte parameter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gte: '1.2.invalid' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Semver: lt parameter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', lt: 'not.a.version' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Semver: lte parameter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', lte: 'xyz' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Semver: eq parameter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', eq: '1.2.3.4.5' },
      expectedStatus: 400
    },

    {
      name: '✅ Valid Semver Coercion: Partial versions',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gte: '1', lt: '2' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    {
      name: '✅ Valid Semver Coercion: Two-part versions',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gte: '1.0', lt: '2.0' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    {
      name: '❌ Invalid Source: Empty string',
      params: { package: 'test.package', source: '' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Source: Mixed case not matching enum',
      params: { package: 'test.package', source: 'NuGet' },
      expectedStatus: 400
    },

    {
      name: '❌ Invalid Source: Multiple values',
      params: { package: 'test.package', source: 'nuget,github' },
      expectedStatus: 400
    },

    {
      name: '✅ Valid Source: GitHub lowercase',
      params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: { logo: 'github' }
    },

    {
      name: '❌ Missing Package with Path Parameter (empty path)',
      params: { source: 'nuget' },
      pathParam: '',
      expectedStatus: 400
    },

    {
      name: '❌ Missing Package with Path Parameter (whitespace only)',
      params: { source: 'nuget' },
      pathParam: '   ',
      expectedStatus: 400
    },

    {
      name: '✅ Boolean Parameter: prefer-clean with various values',
      params: { package: 'localstack.client', source: 'github', 'include-prerelease': 'true', 'prefer-clean': 'false' },
      expectedStatus: 200,
      validation: { logo: 'github' }
    },

    {
      name: '✅ Boolean Parameter: log parameter acceptance',
      params: { package: 'Newtonsoft.Json', source: 'nuget', log: 'true' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    {
      name: '✅ Boolean Parameter: log parameter with false',
      params: { package: 'Newtonsoft.Json', source: 'nuget', log: 'false' },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    },

    {
      name: '✅ Custom Label: Special characters allowed',
      params: { package: 'Newtonsoft.Json', source: 'nuget', label: 'My Custom Label 123!@#' },
      expectedStatus: 200,
      validation: {
        labelContains: 'My Custom Label 123!@#'
      }
    },

    {
      name: '✅ Custom Color: Hex color validation',
      params: { package: 'Newtonsoft.Json', source: 'nuget', color: '#FF5733' },
      expectedStatus: 200,
      validation: {
        color: '#FF5733'
      }
    },

    {
      name: '✅ Multiple Parameter Variants: All at once',
      params: { 
        package: 'Microsoft.EntityFrameworkCore', 
        source: 'nuget', 
        includePrerelease: 'true',  // camelCase
        'prefer-clean': 'true',     // kebab-case
        gt: '1.0',                  // partial semver
        track: 'v8'                 // v-prefixed track
      },
      expectedStatus: 200,
      validation: { logo: 'nuget' }
    }
  ];

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n[${i + 1}/${tests.length}]`);
    const result = await runTest(
      test.name, 
      test.params, 
      test.pathParam, 
      test.expectedStatus, 
      test.validation || {},
      test.validateAPI || false
    );
    
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (!process.env.GITHUB_TOKEN) {
    console.log('\n💡 GitHub tests skipped - set GITHUB_TOKEN in .env file to test GitHub Packages');
  }
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n🏁 Testing completed!');
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error); 