import { vi } from 'vitest';

/**
 * Create a mock Lambda event for testing
 */
export function createMockEvent(options = {}) {
  const {
    proxy = '',
    queryStringParameters = {},
    httpMethod = 'GET',
    headers = {}
  } = options;

  return {
    resource: '/{proxy+}',
    path: proxy ? `/${proxy}` : '/',
    httpMethod,
    headers: {
      'Host': 'localhost:3000',
      'User-Agent': 'vitest-client',
      ...headers
    },
    multiValueHeaders: {},
    pathParameters: proxy ? { proxy } : null,
    queryStringParameters,
    multiValueQueryStringParameters: Object.fromEntries(
      Object.entries(queryStringParameters).map(([k, v]) => [k, [v]])
    ),
    stageVariables: null,
    requestContext: {
      resourceId: 'test',
      resourcePath: '/{proxy+}',
      httpMethod,
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

/**
 * Create a mock Lambda response for testing
 */
export function createMockResponse(statusCode = 200, data = null, headers = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300',
    ...headers
  };

  const response = {
    statusCode,
    headers: defaultHeaders
  };

  if (data) {
    response.body = JSON.stringify(data);
  }

  return response;
}

/**
 * Create a mock shields.io badge response
 */
export function createMockBadgeResponse(message = '1.0.0', options = {}) {
  const {
    label = 'test package',
    color = 'blue',
    logo = 'nuget',
    cacheSeconds = 300
  } = options;

  return {
    schemaVersion: 1,
    label,
    message,
    color,
    namedLogo: logo,
    cacheSeconds
  };
}

/**
 * Create a mock test result from Gist
 */
export function createMockTestResult(platform = 'linux', options = {}) {
  const {
    passed = 1099,
    failed = 0,
    skipped = 0,
    total = passed + failed + skipped,
    url_html = `https://github.com/example/repo/runs/12345`,
    timestamp = new Date().toISOString(),
    commit = 'abc123',
    run_id = '12345'
  } = options;

  return {
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    passed,
    failed,
    skipped,
    total,
    url_html,
    timestamp,
    commit,
    run_id
  };
}

/**
 * Mock axios for API calls
 */
export function mockAxios() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: {
      headers: {}
    }
  };
}

/**
 * Mock GitHub Gist API response
 */
export function createMockGistResponse(platforms = ['linux', 'windows', 'macos']) {
  const files = {};
  
  platforms.forEach(platform => {
    files[`test-results-${platform}.json`] = {
      content: JSON.stringify(createMockTestResult(platform))
    };
  });

  return {
    data: {
      files,
      updated_at: new Date().toISOString(),
      description: 'Test Results'
    }
  };
}

/**
 * Mock NuGet API response
 */
export function createMockNuGetResponse(packageName = 'test.package', versions = ['1.0.0', '1.1.0', '2.0.0']) {
  return {
    data: {
      versions
    }
  };
}

/**
 * Validate shields.io badge schema
 */
export function validateBadgeSchema(badge) {
  return {
    hasSchemaVersion: typeof badge.schemaVersion === 'number' && badge.schemaVersion === 1,
    hasLabel: typeof badge.label === 'string' && badge.label.length > 0,
    hasMessage: typeof badge.message === 'string' && badge.message.length > 0,
    hasColor: typeof badge.color === 'string' && badge.color.length > 0,
    isValid: function() {
      return this.hasSchemaVersion && this.hasLabel && this.hasMessage && this.hasColor;
    }
  };
}
