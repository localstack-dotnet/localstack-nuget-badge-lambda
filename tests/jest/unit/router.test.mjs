/**
 * Jest Unit Tests - Router Logic
 * Tests route matching and delegation without external dependencies
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockLambdaEvent, resetAllMocks } from '../mocks/testMocks.mjs';

// Mock all handlers before importing to prevent real execution
jest.unstable_mockModule('../../../src/handlers/packageHandler.mjs', () => ({
  packageHandler: {
    handle: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/handlers/testBadgeHandler.mjs', () => ({
  testBadgeHandler: {
    handle: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/handlers/testRedirectHandler.mjs', () => ({
  testRedirectHandler: {
    handle: jest.fn()
  }
}));

// Now import the handler after mocking its dependencies
const { handler } = await import('../../../src/index.mjs');
const { packageHandler } = await import('../../../src/handlers/packageHandler.mjs');
const { testBadgeHandler } = await import('../../../src/handlers/testBadgeHandler.mjs');
const { testRedirectHandler } = await import('../../../src/handlers/testRedirectHandler.mjs');

describe('Router Logic - Unit Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    
    // Set up default mock responses
    packageHandler.handle.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: 'package-mock' })
    });
    
    testBadgeHandler.handle.mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: 'test-badge-mock' })
    });
    
    testRedirectHandler.handle.mockResolvedValue({
      statusCode: 302,
      headers: { Location: 'https://github.com/mock' },
      body: ''
    });
  });

  describe('Root Route - Legacy Compatibility', () => {
    test('should route root path to packageHandler', async () => {
      const event = createMockLambdaEvent({ package: 'test-package', source: 'nuget' });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
      expect(packageHandler.handle).toHaveBeenCalledWith(event, null);
    });

    test('should route empty path to packageHandler', async () => {
      const event = createMockLambdaEvent({ package: 'test-package', source: 'nuget' }, {}, '');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
      expect(packageHandler.handle).toHaveBeenCalledWith(event, null);
    });
  });

  describe('Test Badge Routes', () => {
    test('should route test badge requests to testBadgeHandler', async () => {
      const event = createMockLambdaEvent({}, {}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('test-badge-mock');
      expect(testBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });

    test('should handle all supported platforms', async () => {
      const platforms = ['linux', 'windows', 'macos'];
      
      for (const platform of platforms) {
        const event = createMockLambdaEvent({}, {}, `badge/tests/${platform}`);
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('test-badge-mock');
        expect(testBadgeHandler.handle).toHaveBeenCalledWith(event, platform);
      }
    });

    test('should return 404 for invalid platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'badge/tests/invalid');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Invalid platform');
      expect(testBadgeHandler.handle).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'badge/tests/LINUX');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(testBadgeHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });
  });

  describe('Package Badge Routes', () => {
    test('should route explicit package requests to packageHandler', async () => {
      const event = createMockLambdaEvent({ source: 'nuget' }, {}, 'badge/packages/test-package');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
      expect(packageHandler.handle).toHaveBeenCalledWith(event, 'test-package');
    });

    test('should return 404 for missing package name', async () => {
      const event = createMockLambdaEvent({ source: 'nuget' }, {}, 'badge/packages/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Package name required');
      expect(packageHandler.handle).not.toHaveBeenCalled();
    });

    test('should extract package name correctly', async () => {
      const testCases = [
        'badge/packages/newtonsoft.json',
        'badge/packages/Microsoft.EntityFrameworkCore',
        'badge/packages/localstack.client'
      ];
      
      for (const path of testCases) {
        const expectedPackage = path.split('/')[2];
        const event = createMockLambdaEvent({ source: 'nuget' }, {}, path);
        
        await handler(event);
        
        expect(packageHandler.handle).toHaveBeenCalledWith(event, expectedPackage);
      }
    });
  });

  describe('Redirect Routes', () => {
    test('should route redirect requests to testRedirectHandler', async () => {
      const event = createMockLambdaEvent({}, {}, 'redirect/test-results/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBe('https://github.com/mock');
      expect(testRedirectHandler.handle).toHaveBeenCalledWith(event, 'linux');
    });

    test('should handle all supported platforms for redirects', async () => {
      const platforms = ['linux', 'windows', 'macos'];
      
      for (const platform of platforms) {
        const event = createMockLambdaEvent({}, {}, `redirect/test-results/${platform}`);
        const result = await handler(event);
        
        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toBe('https://github.com/mock');
        expect(testRedirectHandler.handle).toHaveBeenCalledWith(event, platform);
      }
    });

    test('should return 404 for invalid redirect platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'redirect/test-results/invalid');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Invalid platform');
      expect(testRedirectHandler.handle).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive redirect platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'redirect/test-results/WINDOWS');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(testRedirectHandler.handle).toHaveBeenCalledWith(event, 'windows');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const event = createMockLambdaEvent({}, {}, 'unknown/route');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Route not found');
      expect(packageHandler.handle).not.toHaveBeenCalled();
      expect(testBadgeHandler.handle).not.toHaveBeenCalled();
      expect(testRedirectHandler.handle).not.toHaveBeenCalled();
    });

    test('should return 404 for malformed routes', async () => {
      const invalidRoutes = [
        'badge/tests/',
        'badge/packages/',
        'redirect/test-results/',
        'badge/invalid-type/linux',
        'not-a-valid-route'
      ];
      
      for (const route of invalidRoutes) {
        const event = createMockLambdaEvent({}, {}, route);
        const result = await handler(event);
        
        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).error).toContain('Route not found');
      }
    });
  });

  describe('Platform Extraction Logic', () => {
    test('should normalize platform case correctly', async () => {
      const testCases = [
        { input: 'LINUX', expected: 'linux' },
        { input: 'Windows', expected: 'windows' },
        { input: 'MacOS', expected: 'macos' },
        { input: 'linux', expected: 'linux' }
      ];
      
      for (const testCase of testCases) {
        const event = createMockLambdaEvent({}, {}, `badge/tests/${testCase.input}`);
        await handler(event);
        
        expect(testBadgeHandler.handle).toHaveBeenCalledWith(event, testCase.expected);
      }
    });
  });
});
