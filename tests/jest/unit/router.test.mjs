/**
 * Jest Unit Tests - Router Logic
 * Tests route matching and delegation without external dependencies
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { handler } from '../../../src/index.mjs';
import { createMockLambdaEvent, resetAllMocks } from '../mocks/testMocks.mjs';

// Mock all handlers to avoid external dependencies
jest.unstable_mockModule('../../../src/handlers/packageHandler.mjs', () => ({
  packageHandler: {
    handle: jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: 'package-mock' })
    })
  }
}));

jest.unstable_mockModule('../../../src/handlers/testBadgeHandler.mjs', () => ({
  testBadgeHandler: {
    handle: jest.fn().mockResolvedValue({
      statusCode: 200,
      body: JSON.stringify({ message: 'test-badge-mock' })
    })
  }
}));

jest.unstable_mockModule('../../../src/handlers/testRedirectHandler.mjs', () => ({
  testRedirectHandler: {
    handle: jest.fn().mockResolvedValue({
      statusCode: 302,
      headers: { Location: 'https://github.com/mock' }
    })
  }
}));

describe('Router Logic - Unit Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Root Route - Legacy Compatibility', () => {
    test('should route root path to packageHandler', async () => {
      const event = createMockLambdaEvent({ package: 'test-package', source: 'nuget' });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
    });

    test('should route empty path to packageHandler', async () => {
      const event = createMockLambdaEvent({ package: 'test-package', source: 'nuget' }, {}, '');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
    });
  });

  describe('Test Badge Routes', () => {
    test('should route test badge requests to testBadgeHandler', async () => {
      const event = createMockLambdaEvent({}, {}, 'badge/tests/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('test-badge-mock');
    });

    test('should handle all supported platforms', async () => {
      const platforms = ['linux', 'windows', 'macos'];
      
      for (const platform of platforms) {
        const event = createMockLambdaEvent({}, {}, `badge/tests/${platform}`);
        const result = await handler(event);
        
        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body).message).toBe('test-badge-mock');
      }
    });

    test('should return 404 for invalid platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'badge/tests/invalid');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Invalid platform');
    });
  });

  describe('Package Badge Routes', () => {
    test('should route explicit package requests to packageHandler', async () => {
      const event = createMockLambdaEvent({ source: 'nuget' }, {}, 'badge/packages/test-package');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).message).toBe('package-mock');
    });

    test('should return 404 for missing package name', async () => {
      const event = createMockLambdaEvent({ source: 'nuget' }, {}, 'badge/packages/');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Package name required');
    });
  });

  describe('Redirect Routes', () => {
    test('should route redirect requests to testRedirectHandler', async () => {
      const event = createMockLambdaEvent({}, {}, 'redirect/test-results/linux');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBe('https://github.com/mock');
    });

    test('should handle all supported platforms for redirects', async () => {
      const platforms = ['linux', 'windows', 'macos'];
      
      for (const platform of platforms) {
        const event = createMockLambdaEvent({}, {}, `redirect/test-results/${platform}`);
        const result = await handler(event);
        
        expect(result.statusCode).toBe(302);
        expect(result.headers.Location).toBe('https://github.com/mock');
      }
    });

    test('should return 404 for invalid redirect platforms', async () => {
      const event = createMockLambdaEvent({}, {}, 'redirect/test-results/invalid');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Invalid platform');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const event = createMockLambdaEvent({}, {}, 'unknown/route');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Route not found');
    });

    test('should return 404 for empty unknown paths', async () => {
      const event = createMockLambdaEvent({}, {}, 'not-a-valid-route');
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).error).toContain('Route not found');
    });
  });

  describe('Platform Extraction Logic', () => {
    test('should extract platform correctly from various paths', async () => {
      const testCases = [
        { path: 'badge/tests/linux', expected: 'linux' },
        { path: 'badge/tests/LINUX', expected: 'linux' }, // case insensitive
        { path: 'redirect/test-results/windows', expected: 'windows' },
        { path: 'redirect/test-results/MACOS', expected: 'macos' }
      ];
      
      for (const testCase of testCases) {
        const event = createMockLambdaEvent({}, {}, testCase.path);
        const result = await handler(event);
        
        // Should successfully route (not 404) if platform extraction works
        expect(result.statusCode).not.toBe(404);
      }
    });
  });
});
