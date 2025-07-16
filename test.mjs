#!/usr/bin/env node

import { handler } from './index.mjs';
import { config } from 'dotenv';

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

async function runTest(testName, queryParams = {}, pathParam = null, expectedStatus = 200, validation = {}) {
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
      
      return { 
        success: result.statusCode === expectedStatus && schemaErrors.length === 0 && contentErrors.length === 0,
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
  console.log('🚀 PARAMETER-DRIVEN BADGE API TESTS');
  console.log('='.repeat(70));
  console.log(`🔑 GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not Set'}`);
  console.log('='.repeat(70));

  const tests = [
    // Basic functionality tests
    {
      name: '🔵 Basic NuGet Package',
      params: { package: 'Newtonsoft.Json', source: 'nuget' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^\d+\.\d+\.\d+$/,  // Semver format
        color: 'blue',  // Should be stable
        logo: 'nuget',
        labelContains: 'newtonsoft.json'
      }
    },
    
    {
      name: '🎯 Track v2 Only',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', track: '2' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+$/,  // Should start with 2.x
        color: 'blue',
        logo: 'nuget'
      }
    },
    
    {
      name: '🎯 Track v1 (should be not found for this package)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', track: '1' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,
        color: 'lightgrey',
        logo: 'nuget'
      }
    },
    
    {
      name: '🔄 Include Prereleases',
      params: { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', 'include-prerelease': 'true' },
      expectedStatus: 200,
      validation: {
        logo: 'nuget',
        labelContains: 'microsoft'
      }
    },
    
    {
      name: '📊 Semver Range Filter (gte)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0' },
      expectedStatus: 200,
      validation: {
        logo: 'nuget'
      }
    },
    
    {
      name: '📊 Semver Range Filter (combined)',
      params: { package: 'Microsoft.AspNetCore.App', source: 'nuget', gte: '2.0.0', lt: '3.0.0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^2\.\d+\.\d+$/,  // Should be 2.x version
        logo: 'nuget'
      }
    },
    
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
      name: '🛤️  Path Parameter Fallback',
      params: { source: 'nuget', track: '2' },
      pathParam: 'Microsoft.AspNetCore.App',
      expectedStatus: 200,
      validation: {
        logo: 'nuget'
      }
    },
    
    // Error cases
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
      name: '❌ Invalid Package Name',
      params: { package: 'invalid/package/name!', source: 'nuget' },
      expectedStatus: 400
    },
    
    {
      name: '❌ Missing Package Parameter',
      params: { source: 'nuget' },
      expectedStatus: 400
    },
    
    // GitHub tests (conditional)
    ...(process.env.GITHUB_TOKEN ? [
      {
        name: '🐙 GitHub Package',
        params: { package: 'localstack.client', source: 'github' },
        expectedStatus: 200,
        validation: {
          logo: 'github',
          labelContains: 'localstack.client'
        }
      }
    ] : []),
    
    // Edge cases
    {
      name: '⚠️  Invalid Source',
      params: { package: 'test.package', source: 'invalid-source' },
      expectedStatus: 500
    },
    
    {
      name: '⚠️  Impossible Range Filter',
      params: { package: 'Newtonsoft.Json', source: 'nuget', gt: '99.0.0' },
      expectedStatus: 200,
      validation: {
        messagePattern: /^not found$/,
        color: 'lightgrey'
      }
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
      test.validation || {}
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
  
  console.log('\n🏁 Testing completed!');
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(console.error); 