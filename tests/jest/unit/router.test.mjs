/*──────────────────────────────────────
  Unit Tests: Router Logic
  Tests route matching, delegation, validation, and error handling
──────────────────────────────────────*/

import { jest } from '@jest/globals';
import { createLambdaEvent, expectErrorResponse, mockConsoleError } from '../helpers/testUtils.mjs';

// Mock all the handlers to isolate router logic
const mockPackageHandler = {
  handle: jest.fn()
};

const mockTestBadgeHandler = {
  handle: jest.fn()
};

const mockTestRedirectHandler = {
  handle: jest.fn()
};

// Mock the handler modules
jest.unstable_mockModule('../../../src/handlers/packageHandler.mjs', () => ({
  packageHandler: mockPackageHandler
}));

jest.unstable_mockModule('../../../src/handlers/testBadgeHandler.mjs', () => ({
  testBadgeHandler: mockTestBadgeHandler
}));

jest.unstable_mockModule('../../../src/handlers/testRedirectHandler.mjs', () => ({
  testRedirectHandler: mockTestRedirectHandler
}));

// Import handler after mocking
const { handler } = await import('../../../src/index.mjs');

describe('AWS Lambda Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockPackageHandler.handle.mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'package-handler-response' })
    });

    mockTestBadgeHandler.handle.mockResolvedValue({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test-badge-response' })
    });

    mockTestRedirectHandler.handle.mockResolvedValue({
      statusCode: 302,
      headers: { 'Location': 'test-redirect-url' },
      body: ''
    });
  });

  describe('Route Matching & Delegation', () => {
    test('delegates badge/tests/linux to testBadgeHandler with correct platform', async () => {
      const event = createLambdaEvent('badge/tests/linux');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
      expect(mockPackageHandler.handle).not.toHaveBeenCalled();
      expect(mockTestRedirectHandler.handle).not.toHaveBeenCalled();
    });

    test('delegates badge/tests/windows to testBadgeHandler with correct platform', async () => {
      const event = createLambdaEvent('badge/tests/windows');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'windows');
    });

    test('delegates badge/tests/macos to testBadgeHandler with correct platform', async () => {
      const event = createLambdaEvent('badge/tests/macos');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'macos');
    });

    test('delegates badge/packages/localstack.client to packageHandler with path param', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, 'localstack.client');
      expect(mockTestBadgeHandler.handle).not.toHaveBeenCalled();
    });

    test('delegates redirect/test-results/linux to testRedirectHandler with platform', async () => {
      const event = createLambdaEvent('redirect/test-results/linux');
      
      await handler(event);
      
      expect(mockTestRedirectHandler.handle).toHaveBeenCalledWith(event, 'linux');
      expect(mockPackageHandler.handle).not.toHaveBeenCalled();
      expect(mockTestBadgeHandler.handle).not.toHaveBeenCalled();
    });

    test('delegates redirect/test-results/windows to testRedirectHandler', async () => {
      const event = createLambdaEvent('redirect/test-results/windows');
      
      await handler(event);
      
      expect(mockTestRedirectHandler.handle).toHaveBeenCalledWith(event, 'windows');
    });

    test('delegates root path "" to packageHandler for backward compatibility', async () => {
      const event = createLambdaEvent('');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, null);
      expect(mockTestBadgeHandler.handle).not.toHaveBeenCalled();
    });

    test('delegates root path "/" to packageHandler for backward compatibility', async () => {
      const event = createLambdaEvent('/');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, null);
    });

    test('handles missing pathParameters gracefully', async () => {
      const event = createLambdaEvent();
      event.pathParameters = null;
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, null);
    });
  });

  describe('Platform Validation', () => {
    test('accepts valid platform: linux', async () => {
      const event = createLambdaEvent('badge/tests/linux');
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      expect(mockTestBadgeHandler.handle).toHaveBeenCalled();
    });

    test('accepts valid platform: windows', async () => {
      const event = createLambdaEvent('badge/tests/windows');
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      expect(mockTestBadgeHandler.handle).toHaveBeenCalled();
    });

    test('accepts valid platform: macos', async () => {
      const event = createLambdaEvent('badge/tests/macos');
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      expect(mockTestBadgeHandler.handle).toHaveBeenCalled();
    });

    test('rejects invalid platform "ubuntu" with 400 error', async () => {
      const event = createLambdaEvent('badge/tests/ubuntu');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid platform. Use: linux, windows, macos');
      expect(mockTestBadgeHandler.handle).not.toHaveBeenCalled();
    });

    test('rejects invalid platform "win32" with 400 error', async () => {
      const event = createLambdaEvent('badge/tests/win32');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid platform. Use: linux, windows, macos');
    });

    test('rejects empty platform with 400 error', async () => {
      const event = createLambdaEvent('badge/tests/');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 400);
    });

    test('validates platform for redirect routes too', async () => {
      const event = createLambdaEvent('redirect/test-results/ubuntu');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 400);
      expect(mockTestRedirectHandler.handle).not.toHaveBeenCalled();
    });

    test('normalizes case correctly', async () => {
      const event = createLambdaEvent('badge/tests/Linux'); // Capital L gets normalized to lowercase
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200); // Should succeed after case normalization
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });
  });

  describe('Package Name Validation', () => {
    test('rejects empty package names in explicit routes', async () => {
      const event = createLambdaEvent('badge/packages/');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Package name required');
      expect(mockPackageHandler.handle).not.toHaveBeenCalled();
    });

    test('rejects missing package segments in path', async () => {
      const event = createLambdaEvent('badge/packages'); // Missing trailing slash, so doesn't match badge/packages/ route
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404); // Falls through to 404, not 400
    });

    test('handles URL-encoded package names correctly', async () => {
      const event = createLambdaEvent('badge/packages/my%20package');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, 'my%20package');
    });

    test('accepts valid package names', async () => {
      const event = createLambdaEvent('badge/packages/localstack.client');
      
      const response = await handler(event);
      
      expect(response.statusCode).toBe(200);
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, 'localstack.client');
    });

    test('accepts complex package names', async () => {
      const event = createLambdaEvent('badge/packages/Microsoft.AspNetCore.App');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, 'microsoft.aspnetcore.app'); // Router normalizes to lowercase
    });
  });

  describe('404 Error Handling', () => {
    test('returns 404 for unknown route "api/v1/badges"', async () => {
      const event = createLambdaEvent('api/v1/badges');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Route not found: /api/v1/badges');
      expect(mockPackageHandler.handle).not.toHaveBeenCalled();
      expect(mockTestBadgeHandler.handle).not.toHaveBeenCalled();
      expect(mockTestRedirectHandler.handle).not.toHaveBeenCalled();
    });

    test('returns 404 for malformed path "badge/tests"', async () => {
      const event = createLambdaEvent('badge/tests');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Route not found: /badge/tests');
    });

    test('returns 404 for invalid nested paths', async () => {
      const event = createLambdaEvent('badge/invalid/path');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404);
    });

    test('404 response includes helpful error message', async () => {
      const event = createLambdaEvent('completely/unknown/route');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Route not found');
      expect(body.error).toContain('completely/unknown/route');
    });

    test('handles routes with special characters', async () => {
      const event = createLambdaEvent('badge@invalid#route');
      
      const response = await handler(event);
      
      expectErrorResponse(response, 404);
    });
  });

  describe('Global Error Handling', () => {
    test('catches handler exceptions and returns 500', async () => {
      const consoleSpy = mockConsoleError();
      
      // Make packageHandler throw an error
      mockPackageHandler.handle.mockRejectedValue(new Error('Handler crashed'));
      
      const event = createLambdaEvent('');
      const response = await handler(event);
      
      expect(response.statusCode).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      
      expect(consoleSpy).toHaveBeenCalledWith('🔥 Router error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('preserves error context in console logs', async () => {
      const consoleSpy = mockConsoleError();
      
      const testError = new Error('Specific test error');
      mockTestBadgeHandler.handle.mockRejectedValue(testError);
      
      const event = createLambdaEvent('badge/tests/linux');
      await handler(event);
      
      expect(consoleSpy).toHaveBeenCalledWith('🔥 Router error:', testError);
      
      consoleSpy.mockRestore();
    });

    test('handles async handler rejections', async () => {
      mockTestRedirectHandler.handle.mockRejectedValue(new Error('Async failure'));
      
      const event = createLambdaEvent('redirect/test-results/linux');
      const response = await handler(event);
      
      expect(response.statusCode).toBe(500);
      
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    test('maintains error response format consistency', async () => {
      mockPackageHandler.handle.mockRejectedValue(new Error('Test error'));
      
      const event = createLambdaEvent('badge/packages/test.package');
      const response = await handler(event);
      
      expect(response.statusCode).toBe(500);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(response.body).toBeDefined();
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(typeof body.error).toBe('string');
    });
  });

  describe('Edge Cases & Path Handling', () => {
    test('handles paths correctly', async () => {
      const event = createLambdaEvent('badge/tests/linux'); // Standard path format
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });

    test('handles paths without leading slash', async () => {
      const event = createLambdaEvent('badge/tests/windows');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'windows');
    });

    test('handles empty proxy parameter', async () => {
      const event = createLambdaEvent('');
      event.pathParameters = { proxy: '' };
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, null);
    });

    test('handles whitespace in paths', async () => {
      const event = createLambdaEvent('  badge/tests/linux  ');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });

    test('handles mixed case in route paths', async () => {
      const event = createLambdaEvent('BADGE/TESTS/linux');
      
      await handler(event);
      
      expect(mockTestBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });

    test('handles complex package names in paths', async () => {
      const event = createLambdaEvent('badge/packages/Microsoft.Extensions.DependencyInjection.Abstractions');
      
      await handler(event);
      
      expect(mockPackageHandler.handle).toHaveBeenCalledWith(event, 'microsoft.extensions.dependencyinjection.abstractions'); // Router normalizes to lowercase
    });
  });

  describe('Response Forwarding', () => {
    test('forwards packageHandler response correctly', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=3600' },
        body: JSON.stringify({ schemaVersion: 1, label: 'test', message: '1.2.3', color: 'blue' })
      };
      
      mockPackageHandler.handle.mockResolvedValue(mockResponse);
      
      const event = createLambdaEvent('');
      const response = await handler(event);
      
      expect(response).toEqual(mockResponse);
    });

    test('forwards testBadgeHandler response correctly', async () => {
      const mockResponse = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaVersion: 1, label: 'tests', message: '100 passed', color: 'success' })
      };
      
      mockTestBadgeHandler.handle.mockResolvedValue(mockResponse);
      
      const event = createLambdaEvent('badge/tests/linux');
      const response = await handler(event);
      
      expect(response).toEqual(mockResponse);
    });

    test('forwards testRedirectHandler response correctly', async () => {
      const mockResponse = {
        statusCode: 302,
        headers: { 'Location': 'https://github.com/example/repo/actions', 'Cache-Control': 'max-age=300' },
        body: ''
      };
      
      mockTestRedirectHandler.handle.mockResolvedValue(mockResponse);
      
      const event = createLambdaEvent('redirect/test-results/macos');
      const response = await handler(event);
      
      expect(response).toEqual(mockResponse);
    });
  });
}); 