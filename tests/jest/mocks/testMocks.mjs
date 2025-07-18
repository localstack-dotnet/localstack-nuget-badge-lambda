/**
 * Jest Mock Utilities for LocalStack Badge API
 * Provides reusable mocks for testing without external dependencies
 */

import { jest } from '@jest/globals';

/**
 * Mock AWS Lambda event for testing routes
 */
export const createMockLambdaEvent = (queryStringParameters = {}, pathParameters = {}, path = '') => ({
  httpMethod: 'GET',
  path: `/${path}`,
  pathParameters,
  queryStringParameters,
  headers: {
    'Accept': 'application/json',
    'User-Agent': 'jest-test'
  },
  body: null,
  isBase64Encoded: false
});

/**
 * Mock successful HTTP response
 */
export const createMockResponse = (statusCode = 200, body = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify(body)
});

/**
 * Mock axios for HTTP requests
 */
export const createAxiosMock = () => {
  const axiosMock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    request: jest.fn()
  };
  
  // Default successful responses
  axiosMock.get.mockResolvedValue({
    status: 200,
    data: { versions: ['1.0.0', '2.0.0'] }
  });
  
  return axiosMock;
};

/**
 * Mock GitHub Gist service responses
 */
export const createGistMockData = (platform = 'linux') => ({
  data: {
    files: {
      [`test-results-${platform}.json`]: {
        content: JSON.stringify({
          passed: 1099,
          failed: 0,
          skipped: 0,
          total: 1099,
          url_html: `https://github.com/localstack-dotnet/localstack-dotnet-client/runs/46253069370`,
          timestamp: '2025-07-18T11:10:51Z'
        })
      }
    }
  }
});

/**
 * Mock NuGet API responses
 */
export const createNuGetMockData = (packageName = 'Newtonsoft.Json') => ({
  versions: [
    '1.0.0',
    '2.0.0-preview1',
    '2.0.0',
    '13.0.3'
  ]
});

/**
 * Mock GitHub Packages API responses
 */
export const createGitHubPackagesMockData = (packageName = 'localstack.client') => ({
  data: [
    {
      name: '2.0.0-preview1',
      prerelease: true
    },
    {
      name: '1.6.0',
      prerelease: false
    }
  ]
});

/**
 * Reset all mocks - useful in beforeEach
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};
