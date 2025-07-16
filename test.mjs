#!/usr/bin/env node

import { handler } from './index.mjs';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

function createTestEvent(packageName, queryParams = {}) {
  return {
    resource: '/{proxy+}',
    path: `/${packageName}`,
    httpMethod: 'GET',
    headers: {
      'Host': 'localhost:3000',
      'User-Agent': 'test-client'
    },
    multiValueHeaders: {},
    pathParameters: {
      proxy: packageName
    },
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

async function runTest(testName, packageName, queryParams = {}, expectedStatus = 200) {
  console.log(`\n🧪 ${testName}`);
  console.log(`📦 Package: ${packageName}`);
  console.log(`🔍 Params: ${JSON.stringify(queryParams)}`);
  console.log('─'.repeat(60));
  
  try {
    const event = createTestEvent(packageName, queryParams);
    const result = await handler(event);
    
    const statusIcon = result.statusCode === expectedStatus ? '✅' : '❌';
    console.log(`${statusIcon} Status: ${result.statusCode} (expected: ${expectedStatus})`);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      console.log(`📊 Message: ${data.message}`);
      console.log(`🎨 Colors: v1=${data.v1_color}, v2=${data.v2_color}, overall=${data.color}`);
      console.log(`🏷️  Source: ${data.source} | Prerelease: ${data.includePrerelease}`);
      
      // Show condensed response for successful tests
      const condensed = {
        v1_track: data.v1_track,
        v2_track: data.v2_track,
        v1_color: data.v1_color,
        v2_color: data.v2_color,
        source: data.source
      };
      console.log(`📄 Key Fields:`, JSON.stringify(condensed, null, 2));
      
    } else {
      console.log(`❌ Error:`, result.body);
    }
    
    return result;
    
  } catch (error) {
    console.log(`💥 Exception:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 LOCALSTACK BADGE API TESTS');
  console.log('='.repeat(60));
  console.log(`🔑 GitHub Token: ${process.env.GITHUB_TOKEN ? '✅ Set' : '❌ Not Set'}`);
  console.log('='.repeat(60));

  const tests = [
    // Core NuGet Tests
    {
      name: '🔵 NuGet - LocalStack.Client (with prerelease)',
      package: 'localstack.client',
      params: { includePrerelease: 'true', log: 'true' },
      expectedStatus: 200
    },
    {
      name: '🔵 NuGet - LocalStack.Client (stable only)',
      package: 'localstack.client',
      params: { includePrerelease: 'false' },
      expectedStatus: 200
    },
    {
      name: '🔵 NuGet - Non-existent package',
      package: 'non.existent.package.test',
      params: { source: 'nuget', log: 'true' },
      expectedStatus: 404
    },

    // GitHub Tests (conditional)
    ...(process.env.GITHUB_TOKEN ? [
      {
        name: '🐙 GitHub - LocalStack.Client (with prerelease)',
        package: 'localstack.client',
        params: { source: 'github', includePrerelease: 'true', log: 'true' },
        expectedStatus: 200
      },
      {
        name: '🐙 GitHub - LocalStack.Client (stable only)',
        package: 'localstack.client',  
        params: { source: 'github', includePrerelease: 'false' },
        expectedStatus: 200
      },
      {
        name: '🐙 GitHub - Non-existent package',
        package: 'fake-org.fake-package',
        params: { source: 'github', log: 'true' },
        expectedStatus: 404
      }
    ] : []),

    // Edge Cases
    {
      name: '⚠️  Edge - Invalid source',
      package: 'localstack.client',
      params: { source: 'invalid-source' },
      expectedStatus: 500
    },
    {
      name: '⚠️  Edge - Empty package name',
      package: '',
      params: { log: 'true' },
      expectedStatus: 400
    }
  ];

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n[${i + 1}/${tests.length}]`);
    const result = await runTest(test.name, test.package, test.params, test.expectedStatus);
    
    if (result && result.statusCode === test.expectedStatus) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${tests.length}`);
  
  if (!process.env.GITHUB_TOKEN) {
    console.log('\n💡 GitHub tests skipped - set GITHUB_TOKEN in .env file');
  }
  
  console.log('\n🏁 Testing completed!');
}

main().catch(console.error); 