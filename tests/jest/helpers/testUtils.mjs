/*──────────────────────────────────────
  Test Utilities for Jest Unit Tests
  Provides mocking helpers and common test patterns
──────────────────────────────────────*/

import { jest } from '@jest/globals';

/**
 * Creates a Lambda event structure similar to test.mjs but adapted for unit tests
 */
export function createLambdaEvent(path = '', queryParams = {}) {
  return {
    resource: '/{proxy+}',
    path: path ? `/${path}` : '/',
    httpMethod: 'GET',
    headers: {
      'Host': 'localhost:3000',
      'User-Agent': 'jest-test-client'
    },
    multiValueHeaders: {},
    pathParameters: path ? { proxy: path } : null,
    queryStringParameters: queryParams,
    multiValueQueryStringParameters: queryParams ? Object.fromEntries(
      Object.entries(queryParams).map(([k, v]) => [k, [v]])
    ) : {},
    stageVariables: null,
    requestContext: {
      resourceId: 'test',
      resourcePath: '/{proxy+}',
      httpMethod: 'GET',
      extendedRequestId: 'test-unit',
      requestTime: new Date().toISOString(),
      path: '/test',
      accountId: 'test',
      protocol: 'HTTP/1.1',
      stage: 'test',
      domainPrefix: 'test',
      requestTimeEpoch: Date.now(),
      requestId: 'test-unit',
      identity: { sourceIp: '127.0.0.1' },
      domainName: 'localhost',
      apiId: 'test-unit'
    },
    body: null,
    isBase64Encoded: false
  };
}

/**
 * Mock axios.get with successful response
 */
export function mockAxiosGet(responseData, status = 200, headers = {}) {
  return jest.fn().mockResolvedValue({
    data: responseData,
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  });
}

/**
 * Mock axios.get with error response
 */
export function mockAxiosError(status, message = 'Network Error', responseData = null) {
  const error = new Error(message);
  error.response = { 
    status, 
    statusText: getStatusText(status),
    data: responseData
  };
  return jest.fn().mockRejectedValue(error);
}

/**
 * Mock console.log and return the spy for assertions
 */
export function mockConsoleLog() {
  return jest.spyOn(console, 'log').mockImplementation(() => {});
}

/**
 * Mock console.error and return the spy for assertions
 */
export function mockConsoleError() {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
}

/**
 * Validates that a response matches shields.io badge format
 */
export function expectShieldsIoFormat(response) {
  expect(response.statusCode).toBe(200);
  expect(response.headers['Content-Type']).toBe('application/json');
  
  const body = JSON.parse(response.body);
  expect(body).toHaveProperty('schemaVersion', 1);
  expect(body).toHaveProperty('label');
  expect(body).toHaveProperty('message');
  expect(body).toHaveProperty('color');
  expect(typeof body.label).toBe('string');
  expect(typeof body.message).toBe('string');
  expect(typeof body.color).toBe('string');
}

/**
 * Validates error response format
 */
export function expectErrorResponse(response, expectedStatus) {
  expect(response.statusCode).toBe(expectedStatus);
  expect(response.headers['Content-Type']).toBe('application/json');
  
  const body = JSON.parse(response.body);
  expect(body).toHaveProperty('error');
  expect(typeof body.error).toBe('string');
}

/**
 * Validates test badge response format
 */
export function expectTestBadgeFormat(response, expectedMessage, expectedColor) {
  expectShieldsIoFormat(response);
  
  const body = JSON.parse(response.body);
  expect(body.label).toBe('tests');
  expect(body.message).toBe(expectedMessage);
  expect(body.color).toBe(expectedColor);
  expect(body).toHaveProperty('cacheSeconds');
}

/**
 * Validates redirect response format
 */
export function expectRedirectResponse(response, expectedUrl) {
  expect(response.statusCode).toBe(302);
  expect(response.headers).toHaveProperty('Location');
  if (expectedUrl) {
    expect(response.headers.Location).toBe(expectedUrl);
  }
  expect(response.body).toBe('');
}

/**
 * Helper to get HTTP status text for mocking
 */
function getStatusText(status) {
  const statusTexts = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    404: 'Not Found',
    500: 'Internal Server Error'
  };
  return statusTexts[status] || 'Unknown';
}

/**
 * Utility to wait for a specified time (useful for async tests)
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock Date.now() for consistent timestamps in tests
 */
export function mockDateNow(timestamp = 1642781400000) { // 2022-01-21T12:30:00.000Z
  return jest.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Create a mock cache for testing cache behavior
 */
export function createMockCache() {
  const cache = new Map();
  return {
    get: jest.fn((key) => cache.get(key)),
    set: jest.fn((key, value) => cache.set(key, value)),
    delete: jest.fn((key) => cache.delete(key)),
    clear: jest.fn(() => cache.clear()),
    has: jest.fn((key) => cache.has(key)),
    size: () => cache.size
  };
} 