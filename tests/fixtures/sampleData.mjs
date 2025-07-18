/*──────────────────────────────────────────────────
  Test Fixtures - Sample Data for Testing
──────────────────────────────────────────────────*/

// Sample Lambda event structures
export const createMockEvent = (queryParams = {}, pathParam = null) => ({
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
});

// Sample package data
export const samplePackages = {
  valid: {
    name: 'Newtonsoft.Json',
    versions: ['13.0.3', '13.0.2', '13.0.1', '12.0.3', '11.0.2'],
    expectedLatest: '13.0.3'
  },
  withPrerelease: {
    name: 'Microsoft.EntityFrameworkCore',
    versions: ['8.0.0', '8.0.0-rc.2', '7.0.14', '7.0.13'],
    expectedLatest: '8.0.0',
    expectedLatestPrerelease: '8.0.0-rc.2'
  },
  localstack: {
    name: 'localstack.client',
    versionsV1: ['1.6.0', '1.5.1', '1.5.0'],
    versionsV2: ['2.0.0-preview1', '2.0.0-alpha1'],
    expectedV1: '1.6.0',
    expectedV2: '2.0.0-preview1'
  }
};

// Sample test result data
export const sampleTestResults = {
  linux: {
    platform: "Linux",
    passed: 1099,
    failed: 0,
    skipped: 0,
    total: 1099,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/12345",
    timestamp: "2025-07-18T11:10:51Z",
    commit: "abc123",
    run_id: "12345"
  },
  windows: {
    platform: "Windows",
    passed: 1094,
    failed: 5,
    skipped: 0,
    total: 1099,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/12346",
    timestamp: "2025-07-18T11:15:30Z",
    commit: "def456",
    run_id: "12346"
  },
  macos: {
    platform: "macOS",
    passed: 1099,
    failed: 0,
    skipped: 0,
    total: 1099,
    url_html: "https://github.com/localstack-dotnet/localstack-dotnet-client/runs/12347",
    timestamp: "2025-07-18T11:20:15Z",
    commit: "ghi789",
    run_id: "12347"
  },
  unavailable: null
};

// Expected shield response patterns (for validation)
export const expectedShieldResponses = {
  packageBadge: {
    requiredFields: ['schemaVersion', 'label', 'message', 'color', 'namedLogo'],
    schemaVersion: 1,
    validColors: ['blue', 'orange', 'purple', 'lightgrey'],
    validLogos: ['nuget', 'github']
  },
  testBadge: {
    requiredFields: ['schemaVersion', 'label', 'message', 'color', 'cacheSeconds'],
    schemaVersion: 1,
    label: "tests",
    validColors: ['success', 'critical', 'lightgrey'],
    validMessages: /^(\d+ passed|unavailable|\d+ failed, \d+ passed)$/
  },
  notFound: {
    schemaVersion: 1,
    message: "not found",
    color: "lightgrey",
    validLogos: ['nuget', 'github']
  }
};

// Test parameter combinations
export const testParameters = {
  basic: [
    { package: 'Newtonsoft.Json', source: 'nuget' },
    { package: 'Microsoft.EntityFrameworkCore', source: 'nuget', 'include-prerelease': 'true' }
  ],
  versioning: [
    { package: 'Microsoft.AspNetCore.App', source: 'nuget', track: '2' },
    { package: 'localstack.client', source: 'nuget', track: 'v1' },
    { package: 'Newtonsoft.Json', source: 'nuget', gte: '13.0.0' }
  ],
  customization: [
    { package: 'Newtonsoft.Json', source: 'nuget', label: 'JSON.NET', color: 'purple' },
    { package: 'Newtonsoft.Json', source: 'nuget', color: '#ff6b35' }
  ],
  invalid: [
    { package: 'invalid/package/name!', source: 'nuget' },
    { package: '', source: 'nuget' },
    { package: 'test.package', source: 'invalid-source' }
  ]
};

// Valid platforms for test badges
export const validPlatforms = ['linux', 'windows', 'macos'];
export const invalidPlatforms = ['invalid', 'ubuntu', 'alpine'];

// Mock HTTP responses
export const mockResponses = {
  nugetSuccess: {
    data: {
      versions: samplePackages.valid.versions
    }
  },
  nuget404: {
    response: { status: 404 },
    message: 'Request failed with status code 404'
  },
  gistSuccess: sampleTestResults.linux,
  gistUnavailable: null
}; 